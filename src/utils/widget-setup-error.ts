export function widgetSetupErrorMessage(error: unknown) {
  const code = typeof error === 'object' && error !== null && 'code' in error ? error.code : undefined;
  const message = error instanceof Error ? error.message : '';
  if (code === 'E_WIDGET_NOT_FOUND') {
    return 'Android could not discover the Duewise home-screen widget. Install a build with the corrected widget configuration; reopening the app will not fix it.';
  }
  if (code === 'E_REQUEST_PIN_WIDGET') {
    return 'Your home screen could not open the Add prompt. Long-press an empty area on your home screen, choose Widgets, then select Duewise.';
  }
  if (/requestPinWidget.*(?:not a function|undefined)|AndroidWidget.*(?:not.*linked|could not be found)/i.test(message)) {
    return 'This app build does not include the current widget support. Install the newly rebuilt Duewise app.';
  }
  return message ? `Could not prepare the widget: ${message}` : 'Could not prepare the widget. Try adding Duewise from your home screen’s widget picker.';
}
