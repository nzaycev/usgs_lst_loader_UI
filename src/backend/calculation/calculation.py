import argparse
from datetime import datetime
import json
import math
import os
import sys
from alive_progress import alive_bar

import time
from lst_maths import calcBT, calcEmission, calcLST, calcNDVI, calcRadiance, calcSurfRad, calcVegProp
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
parser.add_argument('--useQAMask', type=bool, default=False, help='if enable, the layer will be clipped by QA_BAND mask', nargs="?", required=False, const=True)
parser.add_argument('--emission', type=float, help='use const emission value through the map', required=False)

args=parser.parse_args()

flags = []
if args.useQAMask:
    flags.append("withQAMask")
if args.emission:
    flags.append("emission-{}".format(args.emission))
outDirName = "out_{0}-{1}".format(
    datetime.strftime(datetime.now(), "%Y-%m-%d_%H-%M__%S"),
    "_".join(flags)
) 

def applyScaleFactor(band, scale):
    return numpy.multiply(band, scale)

def calcAllLST():
    dir = args.path
    pathTemplate = dir + '/' + dir.split('\\')[-1] + '_{0}.TIF'
    outTemplate = dir + '/' + outDirName + '/{0}.TIF'
    emit = emitToFile

    logger
    with alive_bar(6, title='Reading bands') as bar:            
        def getBandWithLog(x, pathTemplate, scaleFactor):
            bar.text = f'-> Reading band {x}...'
            res, min, max, _ = getBandByName(x, pathTemplate)
            bar()
            return applyScaleFactor(res, scaleFactor)
        getBand = lambda x: getBandWithLog(x, pathTemplate, Band.scaleFactors[x])

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
            saveRaster(outTemplate.format(_name), pathTemplate.format(Band.B5_NAME), x)

    # emit(0.1)
    max_steps = 5 if args.emission else 7
    layers = []
    with alive_bar(max_steps, title='Calculaion') as bar:     
        def doWithProgress(callback, name):
            result = callback()
            bar()
            layers.append({"band": result if name != "NDVI" else result[0], "name": name})
            return result

        if args.emission is not None:
            _emission = doWithProgress(lambda: numpy.full(st_trad_band.shape, args.emission), "Emission")
        else:
            _ndvi, min, max = doWithProgress(lambda: calcNDVI(B5=b5_band, B4=b4_band), "NDVI")
            _vegProp = doWithProgress(lambda: calcVegProp(NDVI=_ndvi, min=min, max=max), "VegProp")
            _emission = doWithProgress(lambda: calcEmission(vegProp=_vegProp), "Emission")

        _surfRad = doWithProgress(lambda: calcSurfRad(ST_TRAD=st_trad_band, ST_URAD=st_urad_band, ST_ATRAN=st_atran_band), "SurfRad")
        _radiance = doWithProgress(lambda: calcRadiance(SurfRad=_surfRad, Emission=_emission, ST_DRAD=st_drad_band), "Radiance")
        satelliteId = '8' if 'LC08' in pathTemplate else '9'
        _bt = doWithProgress(lambda: calcBT(Radiance=_radiance, satelliteId=satelliteId), "BT")
        _lst = doWithProgress(lambda: calcLST(BT=_bt, Emission=_emission), "LST")

    if (args.useQAMask):
        print('Applying QA mask as the --useQAMask flag was provided')
        qa_band = getBand(Band.BQA)
        _lst = numpy.where(qa_band == 21824, _lst, numpy.nan)


    with alive_bar(len(layers), title='Saving') as bar:     
        def saveWithProgress(band, name):
            save(band, name)
            bar()
        
        for layer in layers:
            saveWithProgress(layer["band"], layer["name"])

def emitToFile(x):
    fr = open('index.json', 'r')
    readed = json.load(fr)
    fr.close()
    indexFile = open('index.json', 'w')

    readed['calculation'] = x
    json.dump(readed, indexFile, indent=2)
    indexFile.close()

if __name__ == "__main__":
    os.chdir(args.path)

    # try:
    os.mkdir(outDirName)
    # except:
    #     pass
    print("Start calculation with args", args)
    calcAllLST()
