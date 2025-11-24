import osgeo.gdal as gdal
import numpy
import os

def getBandByName(band_name, pathTemplate=None, fileMappings=None, saveBand = False):
    """
    Получает канал по имени.
    
    Args:
        band_name: Имя канала (например, "SR_B5", "ST_TRAD")
        pathTemplate: Шаблон пути для стандартного формата (опционально)
        fileMappings: Словарь маппингов из index.json {layerType: filePath} (опционально)
        saveBand: Сохранять ли band объект
    
    Returns:
        tuple: (array, min, max, gdalBand)
    """
    # Если есть маппинги, используем их (приоритет)
    if fileMappings and band_name in fileMappings:
        path = fileMappings[band_name]
        # Путь уже должен быть абсолютным (обработан в calculation.py)
        # Но на всякий случай проверяем
        if not os.path.isabs(path):
            path = os.path.abspath(path)
        return bandAsArray(path, 1, saveBand)
    
    # Иначе используем стандартный шаблон
    if pathTemplate:
        path = pathTemplate.format(band_name)
        return bandAsArray(path, 1, saveBand)
    
    raise ValueError(f"Не указан ни pathTemplate, ни fileMappings для канала {band_name}")

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