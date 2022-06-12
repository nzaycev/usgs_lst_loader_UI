import * as React from 'react';
import * as ReactDOM from 'react-dom';
import { MainWindow } from '../ui/mainWindow';

function render() {
  ReactDOM.render(<MainWindow />, document.getElementById("root"));
}

render();