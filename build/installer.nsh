!macro customHeader
  !system "echo '' > ${BUILD_RESOURCES_DIR}/customHeader"
!macroend

!macro preInit
  ; This macro is inserted at the beginning of the NSIS .OnInit callback
  !system "echo '' > ${BUILD_RESOURCES_DIR}/preInit"
!macroend

!macro customInit
  !system "echo '' > ${BUILD_RESOURCES_DIR}/customInit"
!macroend

!macro customInstall
  !system "echo '' > ${BUILD_RESOURCES_DIR}/customInstall"
  File /oname=$PLUGINSDIR\gdal-300-1911-x64-core.msi "${BUILD_RESOURCES_DIR}\plugins\gdal-300-1911-x64-core.msi"
  ExecWait '"msiexec" /i "$PLUGINSDIR\gdal-300-1911-x64-core.msi" /passive'
  File /oname=$PLUGINSDIR\gdal-300-1911-x64-ecw-33.msi "${BUILD_RESOURCES_DIR}\plugins\gdal-300-1911-x64-ecw-33.msi"
  ExecWait '"msiexec" /i "$PLUGINSDIR\gdal-300-1911-x64-ecw-33.msi" /passive'
!macroend

!macro customInstallMode
  # set $isForceMachineInstall or $isForceCurrentInstall
  # to enforce one or the other modes.
!macroend

!macro customWelcomePage
  # Welcome Page is not added by default for installer.
  !insertMacro MUI_PAGE_WELCOME
!macroend