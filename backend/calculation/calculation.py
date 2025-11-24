import argparse
from datetime import datetime
import json
import os
from alive_progress import alive_bar
import sys
from contextlib import contextmanager

import time
from progress_emit import emitProgress

# Helper для создания прогресс-бара с fallback при ошибках
class DummyBar:
    """Пустой бар для fallback при ошибках alive_bar"""
    def __call__(self):
        pass
    @property
    def text(self):
        return self
    @text.setter
    def text(self, value):
        pass

@contextmanager
def safe_alive_bar(total, title, **kwargs):
    """Создает alive_bar с обработкой ошибок кодировки и TTY"""
    # Пробуем использовать alive_bar с отключенным режимом (безопаснее)
    # Если нужен визуальный прогресс, можно попробовать disable=False, но это может вызвать ошибки
    try:
        bar_context = alive_bar(total, title=title, bar='blocks', spinner='classic', disable=True, **kwargs)
        with bar_context as bar:
            yield bar
    except:
        # Если даже disable=True не работает, используем fallback
        dummy = DummyBar()
        yield dummy

from lst_maths import calcBT, calcEmissionWithNdmiLog, calcEmissionWithNdviDiapasons, calcEmissionWithNdviLog, calcEmissionWithVegprop, calcLST, calcNDMI, calcNDVI, calcRadiance, calcSurfRad, calcVegProp
from raster_tools import getBandByName, saveRaster

import band_names as Band
import osgeo.gdal as gdal

import logging
logging.basicConfig(level=logging.INFO)

logger = logging.getLogger("alive_progress")

import numpy
numpy.seterr(divide='ignore', invalid='ignore')

parser=argparse.ArgumentParser(
    description='''Calculation of LST''')

parser.add_argument('--path', type=str, help='location of downloaded bands', required=True)
parser.add_argument('--out', type=str, help='location of calculated layers', required=False, default="./out_{date}-{args}")
# enum {
#   vegProp
#   log
#   logDiapasons
#   ndmi
# }
parser.add_argument('--emissionCalcMethod', type=str, help='way of emission calculation', required=False, default="ndmi")
parser.add_argument('--layerPattern', type=str, help='pattern of calculated layer', required=False, default="{name}")
parser.add_argument('--useQAMask', type=bool, default=False, help='if enable, the layer will be clipped by QA_BAND mask', nargs="?", required=False, const=True)
parser.add_argument('--emission', type=float, help='use const emission value through the map', required=False)
parser.add_argument('--saveBT', type=bool, help='save BT', nargs="?", required=False, const=True)
parser.add_argument('--saveEmission', type=bool, help='save emission', nargs="?", required=False, const=True)
parser.add_argument('--saveLST', type=bool, help='save LST', nargs="?", required=False, const=True)
parser.add_argument('--saveNDVI', type=bool, help='save NDVI', nargs="?", required=False, const=True)
parser.add_argument('--saveNDMI', type=bool, help='save NDMI', nargs="?", required=False, const=True)
parser.add_argument('--saveRadiance', type=bool, help='save Radiance', nargs="?", required=False, const=True)
parser.add_argument('--saveSurfRad', type=bool, help='save SurfRad', nargs="?", required=False, const=True)
parser.add_argument('--saveVegProp', type=bool, help='save VegProp', nargs="?", required=False, const=True)

args=parser.parse_args()

flags = []
if args.useQAMask:
    flags.append("withQAMask")
if args.emission:
    flags.append("emission-{}".format(args.emission))
if args.emissionCalcMethod:
    flags.append("emissionCalcMethod-{}".format(args.emissionCalcMethod))
outDirName = args.out.format(
    date=datetime.strftime(datetime.now(), "%Y-%m-%d_%H-%M__%S"),
    args="_".join(flags),
) 

def applyScaleFactor(band, scale):
    return numpy.multiply(band, scale)

def calcAllLST():
    dir = args.path
    sceneId = dir.split('\\')[-1]
    date = sceneId.split('_')[3] if len(sceneId.split('_')) > 3 else ""
    outTemplate = dir + '/' + outDirName + '/{0}.TIF' if str.startswith(outDirName, './') else outDirName + '/{0}.TIF'
    
    # Читаем index.json для получения маппингов файлов (для !isRepo сцен)
    fileMappings = None
    indexPath = os.path.join(dir, 'index.json')
    if os.path.exists(indexPath):
        try:
            with open(indexPath, 'r', encoding='utf-8') as f:
                indexData = json.load(f)
                if indexData.get('isRepo') == False and indexData.get('donwloadedFiles'):
                    # Создаем словарь маппингов {layerType: filePath}
                    fileMappings = {}
                    for layerType, fileInfo in indexData['donwloadedFiles'].items():
                        if fileInfo and fileInfo.get('filePath'):
                            filePath = fileInfo['filePath']
                            # Если путь относительный, делаем его относительно dir
                            if not os.path.isabs(filePath):
                                filePath = os.path.join(dir, filePath)
                            # Нормализуем путь (убираем лишние разделители, обрабатываем .. и .)
                            filePath = os.path.normpath(filePath)
                            fileMappings[layerType] = filePath
        except Exception as e:
            print(f"Warning: Could not read file mappings from index.json: {e}")
            fileMappings = None
    
    # Если маппингов нет, используем стандартный шаблон пути
    pathTemplate = None
    if not fileMappings or len(fileMappings) == 0:
        pathTemplate = dir + '/' + dir.split('\\')[-1] + '_{0}.TIF'
    
    i = 0
    with safe_alive_bar(7, title='Reading bands') as bar:
        def getBandWithLog(x, pathTemplate, scaleFactor, fileMappings):
            nonlocal i
            i += 1
            emitProgress(1 / 3 * i / 7, 'Reading')
            try:
                bar.text = f'-> Reading band {x}...'
            except:
                pass  # Игнорируем ошибки установки текста
            res, min, max, _ = getBandByName(x, pathTemplate, fileMappings)
            bar()
            return applyScaleFactor(res, scaleFactor)
        getBand = lambda x: getBandWithLog(x, pathTemplate, Band.scaleFactors[x], fileMappings)

        b6_band = getBand(Band.B6_NAME)
        b5_band = getBand(Band.B5_NAME)
        b4_band = getBand(Band.B4_NAME)
        st_trad_band = getBand(Band.ST_TRAD_NAME)
        st_drad_band = getBand(Band.ST_DRAD_NAME)
        st_urad_band = getBand(Band.ST_URAD_NAME)
        st_atran_band = getBand(Band.ST_ATRAN_NAME)


    def save(x, _name, custom_Ethalon = None):
        if custom_Ethalon is not None:
            saveRaster(outTemplate.format(_name), custom_Ethalon, x)
        else:
            # Используем маппинг для эталонного файла, если есть
            if fileMappings and Band.B5_NAME in fileMappings:
                etalonPath = fileMappings[Band.B5_NAME]
            elif pathTemplate:
                etalonPath = pathTemplate.format(Band.B5_NAME)
            else:
                raise ValueError("Не указан ни pathTemplate, ни fileMappings для эталонного файла")
            saveRaster(outTemplate.format(_name), etalonPath, x)

    max_steps = 7 if args.emission else 9
    layers = []
    emitProgress(1 / 3, 'Calculation')  # Начало стадии Calculation
    with safe_alive_bar(max_steps, title='Calculaion') as bar:
        i = 0   
        def doWithProgress(callback, name):
            result = callback()
            bar()
            nonlocal i
            i += 1
            emitProgress(1 / 3 + 1 / 3 * i / max_steps, 'Calculation')
            if vars(args).get('save' + name):
                layers.append({"band": result if name != "NDVI" else result[0], "name": name})
            return result

        # use const value
        if args.emission is not None:
            _emission = doWithProgress(lambda: numpy.full(st_trad_band.shape, args.emission), "Emission")
        else:
            _ndvi, min, max = doWithProgress(lambda: calcNDVI(B5=b5_band, B4=b4_band), "NDVI")
            _vegProp = doWithProgress(lambda: calcVegProp(NDVI=_ndvi, min=min, max=max), "VegProp")
            _ndmi = doWithProgress(lambda: calcNDMI(B5=b5_band, B6=b6_band), "NDMI")

            if args.emissionCalcMethod == 'ndmi':
                _emission = doWithProgress(lambda: calcEmissionWithNdmiLog(ndmi=_ndmi), "Emission")
            elif args.emissionCalcMethod == 'vegProp':
                _emission = doWithProgress(lambda: calcEmissionWithVegprop(vegProp=_vegProp), "Emission")
            elif args.emissionCalcMethod == 'log':
                _emission = doWithProgress(lambda: calcEmissionWithNdviLog(ndvi=_ndvi), "Emission")
            elif args.emissionCalcMethod == 'logDiapasons':
                _emission = doWithProgress(lambda: calcEmissionWithNdviDiapasons(ndvi=_ndvi), "Emission")
            else:
                raise Exception('unexisted emission calculation method')

        _surfRad = doWithProgress(lambda: calcSurfRad(ST_TRAD=st_trad_band, ST_URAD=st_urad_band, ST_ATRAN=st_atran_band), "SurfRad")
        _radiance = doWithProgress(lambda: calcRadiance(SurfRad=_surfRad, Emission=_emission, ST_DRAD=st_drad_band), "Radiance")
        # Определяем satelliteId из маппинга или pathTemplate
        if fileMappings:
            # Пробуем определить из первого файла в маппинге
            firstPath = list(fileMappings.values())[0] if fileMappings else ""
            satelliteId = '8' if 'LC08' in firstPath else '9'
        else:
            satelliteId = '8' if 'LC08' in pathTemplate else '9'
        _bt = doWithProgress(lambda: calcBT(Radiance=_radiance, satelliteId=satelliteId), "BT")
        _lst = doWithProgress(lambda: calcLST(BT=_bt, Emission=_emission), "LST")

    if (args.useQAMask):
        print('Applying QA mask as the --useQAMask flag was provided')
        qa_band = getBand(Band.BQA)
        _lst = numpy.where(qa_band == 21824, _lst, numpy.nan)

    # Явно инициализируем прогресс при переходе на стадию Saving
    # Это гарантирует, что прогресс не будет откатываться назад
    if len(layers) > 0:
        emitProgress(2 / 3, 'Saving')  # Начало стадии Saving
    
    with safe_alive_bar(len(layers), title='Saving') as bar:    
        i = 0 
        def saveWithProgress(band, name):
            save(band, name)
            bar()
            nonlocal i
            i += 1
            # Прогресс от 2/3 до 1.0
            emitProgress(2 / 3 + 1 / 3 * i / len(layers), 'Saving')
        
        for layer in layers:
            saveWithProgress(layer["band"], args.layerPattern.format(name=layer["name"], date=date))

if __name__ == "__main__":
    os.chdir(args.path)

    # try:
    if not os.path.isdir(outDirName):
        os.mkdir(outDirName)
    # except:
    #     pass
    print("Start calculation with args", args)
    calcAllLST()
    emitProgress(1, 'Finished')
    print("Calculation has been succesfully finished", args)
    time.sleep(5)
