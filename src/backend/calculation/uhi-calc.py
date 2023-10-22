# unready feature
import numpy
import osgeo.gdal as gdal
import ogr
import osr

def calcUHI:
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

    emit(0.8)

    print("META", meta)
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

    gdalData = gdal.Open(outTemplate.format("UHI_MASK"))
    gdalBand = gdalData.GetRasterBand(1)
    newField = ogr.FieldDefn('MYFLD', ogr.OFTInteger)
    driver = ogr.GetDriverByName("ESRI Shapefile")

    name = outTemplate.format("Polygonized").replace('.TIF', '')

    outDatasource = driver.CreateDataSource(name)

    spatialRef = osr.SpatialReference()
    spatialRef.ImportFromEPSG(4326)

    spatialRef.MorphToESRI()
    file = open(name + '\\yourshpfile.prj', 'w')
    file.write(spatialRef.ExportToWkt())
    file.close()

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
    gdal.Polygonize(gdalBand, None, outLayer, 0, [],  callback=progress_cb, callback_data='.')
    emit(1)
    outDatasource.Destroy()