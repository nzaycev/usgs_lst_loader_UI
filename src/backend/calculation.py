import inspect
import json
import os
import sys

import ogr
import osr

# from test import defaultTemplate
import time

import numpy
import osgeo.gdal as gdal
numpy.seterr(divide='ignore', invalid='ignore')

B5_NAME = "SR_B5"
B4_NAME = "SR_B4"
ST_TRAD_NAME = "ST_TRAD"
ST_DRAD_NAME = "ST_DRAD"
ST_URAD_NAME = "ST_URAD"
ST_ATRAN_NAME = "ST_ATRAN"
BQA = "QA_PIXEL"

# функция проверяющая растр на многоканальность
def isMultiband(path):
    gdalData = gdal.Open(path)
    if gdalData.RasterCount < 2:
        print("ERROR: raster must contain at least 2 bands")
        return False
    return True


# извлекает из заданного растра канал с заданным номером
def bandAsArray(path, bandNum, saveBand = False):
    gdalData = gdal.Open(path)
    gdalBand = gdalData.GetRasterBand(bandNum)
    array = gdalBand.ReadAsArray().astype(numpy.float32)
    # min, max = gdalBand.GetMinimum(), gdalBand.GetMaximum()
    stat = gdalBand.ComputeStatistics(0)
    print('stat: {}'.format(stat))
    if not saveBand:
        gdalBand = None
    gdalData = None
    return array, stat[0], stat[1], gdalBand


# сохраняет массив array как растр с именем outPath в формате
# GeoTiff. Данные о проекции берутся из растра etalonPath
def saveRaster(outPath, etalonPath, array):
    gdalData = gdal.Open(etalonPath)
    projection = gdalData.GetProjection()
    transform = gdalData.GetGeoTransform()
    xsize = gdalData.RasterXSize
    ysize = gdalData.RasterYSize
    gdalData = None

    print('meta data:', projection, transform, xsize, ysize)

    format = "GTiff"
    driver = gdal.GetDriverByName(format)
    print('driver', driver, outPath)
    metadata = driver.GetMetadata()
    # if metadata.has_key(gdal.DCAP_CREATE) and metadata[gdal.DCAP_CREATE] == "YES":
    outRaster = driver.Create(outPath, xsize, ysize, 1, gdal.GDT_Float32)
    print('outRaster', outRaster)
    outRaster.SetProjection(projection)
    outRaster.SetGeoTransform(transform)
    outRaster.GetRasterBand(1).WriteArray(array)
    outRaster = None
    # else:
    #     print("Driver %s does not support Create() method." % format)
    #     return False

def calcNDVI(B5, B4):
    sum = (B5 + B4)
    ndvi = numpy.where((sum != 0) & (B5 != numpy.nan) & (B4 != numpy.nan), (B5 - B4) / sum, numpy.nan)
    from scipy.ndimage.filters import gaussian_filter
    ndvi = numpy.where(ndvi != 1, ndvi, numpy.nan)
    filtered = gaussian_filter(ndvi, sigma=(2,2), mode="nearest")
    return ndvi, numpy.nanmin(filtered), numpy.nanmax(filtered)

def calcEmission(vegProp):
    return numpy.add(
        numpy.multiply(
            vegProp,
            0.004
        ),
        0.986
    )

def calcVegProp(NDVI, min, max):
    # ndviMin = numpy.matrix.min(NDVI) ?
    ndviMinTest = min
    # ndviMax = numpy.matrix.max(NDVI) ?
    ndviMaxTexs = max
    ndviMin = -0.16288183629513
    ndviMax = 0.85109955072403
    print('min (real: {}, test: {}):'.format(ndviMinTest, ndviMin))
    print('max (real: {}, test: {}):'.format(ndviMaxTexs, ndviMax))
    i,j = numpy.where(NDVI == -0.16288183629513)
    print('i, j:', i,j)
    # sys.exit(0)
    diff = max - min
    base = (NDVI - min)
    b = base / diff
    return numpy.power(b, 2.0)

def calcSurfRad(ST_TRAD, ST_URAD, ST_ATRAN):
    diff = ST_TRAD - ST_URAD
    # return diff ?
    return numpy.where(diff != 0, diff / ST_ATRAN, numpy.nan)

def calcRadiance(SurfRad, Emission, ST_DRAD):
    return numpy.subtract(
        SurfRad,
        numpy.multiply(
            numpy.subtract(
                1,
                Emission
            ),
            ST_DRAD
        )
    )

def calcBT(Radiance, satelliteId = '8'):
    K1 = 774.8853 if satelliteId == '8' else 799.0284
    K2 = 1321.0789 if satelliteId == '8' else 1329.2405

    log = numpy.log(
        numpy.add(
            numpy.divide(
                K1,
                Radiance
            ),
            1
        )
    )

    return numpy.where(log != 0,
        numpy.divide(
            K2,
            log
        )
    , numpy.nan)

def calcLST(BT, Emission):
    lmbd = 10.9
    alph = 14388

    lst = BT / (1 + lmbd * BT * numpy.log(Emission) / alph) - 273.15
    return lst
    return numpy.where(lst > 18, lst, numpy.nan)

def applyScaleFactor(band, scale):
    return numpy.multiply(band, scale)

def retrieve_name(var):
    callers_local_vars = inspect.currentframe().f_back.f_locals.items()
    return [var_name for var_name, var_val in callers_local_vars if var_val is var]

def getBandByName(band_name, pathTemplate, saveBand = False):
    path = pathTemplate.format(band_name)
    return bandAsArray(path, 1, saveBand)

def calcAllLST(dir, emit, spatial):

    # pathTemplate = "layers/LC08_L2SP_142021_20190822_20200827_02_T1_{0}.TIF"
    # pathTemplate, outTemplate, out_dir = defaultTemplate(dir)
    pathTemplate = dir + '/' + dir.split('\\')[-1] + '_{0}.TIF'
    outTemplate = dir + '/out/{0}.TIF'

    print('pathTemplate', pathTemplate, dir)

    t1 = time.time()
    k1 = 0
    def getBandWithLog(x, pathTemplate, scaleFactor):
        res, min, max, _ = getBandByName(x, pathTemplate)
        print(k1, time.time() - t1)
        return applyScaleFactor(res, scaleFactor)
    getBand = lambda x, y: getBandWithLog(x, pathTemplate, y)

    emit(0.05)
    # emit({'calculate': 'LOAD_TO_RAM'})

    b5_band = getBand(B5_NAME, 1)
    b4_band = getBand(B4_NAME, 1)

    st_trad_band = getBand(ST_TRAD_NAME, 0.001)
    k1 = k1 + 1
    st_drad_band = getBand(ST_DRAD_NAME, 0.001)
    k1 = k1 + 1
    st_urad_band = getBand(ST_URAD_NAME, 0.001)
    k1 = k1 + 1
    st_atran_band = getBand(ST_ATRAN_NAME, 0.0001)
    k1 = k1 + 1


    def save(x, _name, custom_Ethalon = None):
        if custom_Ethalon is not None:
            saveRaster(outTemplate.format(_name), custom_Ethalon, x)
        else:
            saveRaster(outTemplate.format(_name), pathTemplate.format(B5_NAME), x)

    emit(0.1)
    # emit({'calculate': 'CALC_SURF_RAD'})

    t = time.time()
    print('START', t)
    _surfRad = calcSurfRad(ST_TRAD=st_trad_band, ST_URAD=st_urad_band, ST_ATRAN=st_atran_band)
    print('.', time.time() - t)
    emit(0.15)
    # emit({'calculate': 'CALC_NDVI'})
    _ndvi, min, max = calcNDVI(B5=b5_band, B4=b4_band)
    # save(_ndvi, "NDVI")
    # ndvi, min, max = bandAsArray('./out/NDVI.tif', 1)
    emit(0.2)
    # emit({'calculate': 'CALC_VEG_PROP'})
    print('..', time.time() - t)
    _vegProp = calcVegProp(NDVI=_ndvi, min=min, max=max)
    print('...', time.time() - t)
    emit(0.3)
    # emit({'calculate': 'CALC_EMISSION'})
    _emission = calcEmission(vegProp=_vegProp)
    print('....', time.time() - t) # v
    emit(0.4)
    # emit({'calculate': 'CALC_RADIANCE'})
    _radiance = calcRadiance(SurfRad=_surfRad, Emission=_emission, ST_DRAD=st_drad_band)
    print('.....', time.time() - t)
    emit(0.5)
    # emit({'calculate': 'CALC_BT'})
    satelliteId = '8' if 'LC08' in pathTemplate else '9'
    print('satelliteId', satelliteId)

    _bt = calcBT(Radiance=_radiance, satelliteId=satelliteId)
    print('......', time.time() - t)
    emit(0.6)
    # emit({'calculate': 'CALC_LST'})
    _lst = calcLST(BT=_bt, Emission=_emission)
    print('....... FINISH', time.time() - t)

    qa_band = getBand(BQA, 1)
    lst = numpy.where(qa_band == 21824, _lst, numpy.nan)

    emit(0.7)
    # emit({'step': 'SAVING'})
    save(_surfRad, "SurfRad")
    save(_vegProp, "VegProp")
    save(_emission, "Emission")
    save(_radiance, "Radiance")
    save(_bt, "BT")
    save(lst, "LST")
    print('SAVED')

    #### META BLOCK

    # META_file = open(out_dir + '/META.txt', 'w')
    # META_file.writelines(
    #
    meta = """
        lst_min: {lst_min}
        lst_max: {lst_max}
        lst_avg: {lst_avg}
        percentile: {percentile}
        median: {median}
    """.format(
        lst_min=numpy.nanmin(lst),
        lst_max=numpy.nanmax(lst),
        lst_avg=numpy.nanmean(lst),
        percentile=numpy.nanpercentile(lst, 85),
        median=numpy.nanmedian(lst)
    )

    if spatial is not None:
        from test import transformPoints
        print('cropping image')
        start = spatial['start']
        end = spatial['end']

        tst = transformPoints(start[1], start[0])
        ten = transformPoints(end[1], end[0])
        bbox = (tst[0], tst[1], ten[0], ten[1])
        gdal.Translate(outTemplate.format("CROPPED_LST".replace('.TIF', '')), outTemplate.format("LST"), projWin=bbox)
        new_lst, _, _, _ = getBandByName('CROPPED_LST', outTemplate)
        perc = numpy.nanpercentile(new_lst, 85)
        uhi_mask = numpy.where(new_lst >= perc, new_lst, numpy.nan)
        save(uhi_mask, "UHI_MASK", outTemplate.format("CROPPED_LST"))

    else:
        uhi_mask = numpy.where(lst >= numpy.nanpercentile(lst, 85), 1, 0)
        save(uhi_mask, "UHI_MASK")

    emit(0.8)

    gdalData = gdal.Open(outTemplate.format("UHI_MASK"))
    # transform = gdalData.GetGeoTransform()
    gdalBand = gdalData.GetRasterBand(1)
    newField = ogr.FieldDefn('MYFLD', ogr.OFTInteger)
    driver = ogr.GetDriverByName("ESRI Shapefile")

    name = outTemplate.format("Polygonized").replace('.TIF', '')

    outDatasource = driver.CreateDataSource(name)

    # srs = osr.SpatialReference()
    # srs.ImportFromEPSG(4326)
    # outDatasource.SetProjection(srs.ExportToWkt())

    spatialRef = osr.SpatialReference()
    spatialRef.ImportFromEPSG(4326)

    spatialRef.MorphToESRI()
    file = open(name + '\\yourshpfile.prj', 'w')
    file.write(spatialRef.ExportToWkt())
    file.close()

    # outDatasource.SetGeoTransform(transform)
    try:
        outDatasource.DeleteLayer("polygonized")
    except:
        pass
    outLayer = outDatasource.CreateLayer("polygonized", srs=None)
    outLayer.CreateField(newField)


    def progress_cb(complete, message, cb_data):
        '''Emit progress report in numbers for 10% intervals and dots for 3%'''
        if int(complete * 100) % 10 == 0:
            print(f'{complete * 100:.0f}', end='', flush=True)
        elif int(complete * 100) % 3 == 0:
            print(f'{cb_data}', end='', flush=True)
        emit({'progress': complete})
    gdal.Polygonize(gdalBand, None, outLayer, 0, [],  callback=progress_cb,
    callback_data='.')
    # emit({'progress': None, 'step': 'SAVING'})
    emit(1)
    outDatasource.Destroy()

    # if spatial is not None:
    #     new_lst, _,_,_ = getBandByName('UHI_MASK', outTemplate)
    #     perc = numpy.nanpercentile(new_lst, 85)
    #     print('np', perc)
    #     ds = gdal.OpenEx(name + "\\polygonized.shp", gdal.OF_VECTOR | gdal.OF_UPDATE)
    #     ds.ExecuteSQL("delete * from polygonized where MYFLD < {0}".format(perc))

    print("META", meta)


# path = 'C:\\Users\\shkid\\AppData\\Roaming\\usgs-lst-loader\\localStorage\\LC08_L2SP_143021_20220704_20220708_02_T1'

def emitToFile(x):
    print(x)
    fr = open('index.json', 'r')
    readed = json.load(fr)
    fr.close()
    indexFile = open('index.json', 'w')

    readed['calculation'] = x
    json.dump(readed, indexFile, indent=2)
    indexFile.close()

if __name__ == "__main__":
    # _, _, path = sys.argv
    path = 'C:\\Users\\shkid\\AppData\\Roaming\\usgs-lst-loader\\localStorage\\LC08_L2SP_142021_20221017_20221031_02_T1'

    os.chdir(path)
    try:
        os.mkdir('out')
    except:
        pass
    calcAllLST(path, lambda x: emitToFile(x), {
        'start': [92.751229, 56.083340],
        'end': [93.074378, 55.978332]
    })
