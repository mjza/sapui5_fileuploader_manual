/* global QUnit */
QUnit.config.autostart = false;

sap.ui.getCore().attachInit(function () {
	"use strict";

	sap.ui.require([
		"com/mjzsoft/FileUploader0Manual/test/unit/AllTests"
	], function () {
		QUnit.start();
	});
});