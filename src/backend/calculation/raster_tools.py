import osgeo.gdal as gdal
import numpy

def getBandByName(band_name, pathTemplate, saveBand = False):
    path = pathTemplate.format(band_name)
    return bandAsArray(path, 1, saveBand)

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
    stat = gdalBand.ComputeStatistics(0)
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

    format = "GTiff"
    driver = gdal.GetDriverByName(format)
    metadata = driver.GetMetadata()
    outRaster = driver.Create(outPath, xsize, ysize, 1, gdal.GDT_Float32)
    outRaster.SetProjection(projection)
    outRaster.SetGeoTransform(transform)
    outRaster.GetRasterBand(1).WriteArray(array)
    outRaster = None