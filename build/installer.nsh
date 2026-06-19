!macro customUnInstall
  MessageBox MB_YESNO "Удалить данные GlucoDesk (настройки, историю, логи)?" IDNO SkipClean
    RMDir /r "$APPDATA\glucodesk"
  SkipClean:
!macroend
