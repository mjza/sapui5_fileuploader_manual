sap.ui.define([
	"./BaseController",
	"sap/ui/model/json/JSONModel",
	"../model/formatter",
	"sap/m/library",
	"sap/m/MessageToast",
	"sap/base/Log",
	"../js/Utils"
	// eslint-disable-next-line max-params
], function (BaseController, JSONModel, formatter, mobileLibrary, MessageToast, Log, Utils) {
	"use strict";

	// shortcut for sap.m.URLHelper
	var URLHelper = mobileLibrary.URLHelper;

	return BaseController.extend("com.mjzsoft.FileUploader0Manual.controller.Detail", {

		formatter: formatter,

		/* =========================================================== */
		/* lifecycle methods                                           */
		/* =========================================================== */

		onInit: function () {
			// Model used to manipulate control states. The chosen values make sure,
			// detail page is busy indication immediately so there is no break in
			// between the busy indication for loading the view's meta data
			var oViewModel = new JSONModel({
				busy: false,
				delay: 0
			});

			this.getRouter().getRoute("object").attachPatternMatched(this._onObjectMatched, this);

			this.setModel(oViewModel, "detailView");

			this.getOwnerComponent().getModel().metadataLoaded().then(this._onMetadataLoaded.bind(this));
		},

		/* =========================================================== */
		/* event handlers                                              */
		/* =========================================================== */

		/**
		 * Event handler when the share by E-Mail button has been clicked
		 * @public
		 */
		onSendEmailPress: function () {
			var oViewModel = this.getModel("detailView");

			URLHelper.triggerEmail(
				null,
				oViewModel.getProperty("/shareSendEmailSubject"),
				oViewModel.getProperty("/shareSendEmailMessage")
			);
		},

		/* =========================================================== */
		/* begin: internal methods                                     */
		/* =========================================================== */

		/**
		 * Binds the view to the object path and expands the aggregated line items.
		 * @function
		 * @param {sap.ui.base.Event} oEvent pattern match event in route 'object'
		 * @private
		 */
		_onObjectMatched: function (oEvent) {
			var sObjectId = oEvent.getParameter("arguments").objectId;
			this.getModel("appView").setProperty("/layout", "TwoColumnsMidExpanded");
			this.getModel().metadataLoaded().then(function () {
				// Reset pending changes of upload collections 
				let aUploadCollections = this.getAllVisibleUploadCollections();
				for (let indx in aUploadCollections) { // eslint-disable-line
					let oUploadCollection = aUploadCollections[indx];
					this.refreshUplodCollection(oUploadCollection);
				}
				// 
				var sObjectPath = this.getModel().createKey("ArticleSet", {
					Id: sObjectId
				});
				this._bindView("/" + sObjectPath);
			}.bind(this));
		},

		/**
		 * Binds the view to the object path. Makes sure that detail view displays
		 * a busy indicator while data for the corresponding element binding is loaded.
		 * @function
		 * @param {string} sObjectPath path to the object to be bound to the view.
		 * @private
		 */
		_bindView: function (sObjectPath) {
			// Set busy indicator during view binding
			var oViewModel = this.getModel("detailView");

			// If the view was not bound yet its not busy, only if the binding requests data it is set to busy again
			oViewModel.setProperty("/busy", false);

			this.getView().bindElement({
				path: sObjectPath,
				events: {
					change: this._onBindingChange.bind(this),
					dataRequested: function () {
						oViewModel.setProperty("/busy", true);
					},
					dataReceived: function () {
						oViewModel.setProperty("/busy", false);
					}
				}
			});
		},

		_onBindingChange: function () {
			var oView = this.getView(),
				oElementBinding = oView.getElementBinding();

			// No data for the binding
			if (!oElementBinding.getBoundContext()) {
				this.getRouter().getTargets().display("detailObjectNotFound");
				// if object could not be found, the selection in the master list
				// does not make sense anymore.
				this.getOwnerComponent().oListSelector.clearMasterListSelection();
				return;
			}

			var sPath = oElementBinding.getPath();

			this.getOwnerComponent().oListSelector.selectAListItem(sPath);
		},

		_onMetadataLoaded: function () {
			// Store original busy indicator delay for the detail view
			var iOriginalViewBusyDelay = this.getView().getBusyIndicatorDelay(),
				oViewModel = this.getModel("detailView");

			// Make sure busy indicator is displayed immediately when
			// detail view is displayed for the first time
			oViewModel.setProperty("/delay", 0);

			// Binding the view will set it to not busy - so the view is always busy if it is not bound
			oViewModel.setProperty("/busy", true);
			// Restore original busy indicator delay for the detail view
			oViewModel.setProperty("/delay", iOriginalViewBusyDelay);
		},

		/**
		 * Set the full screen mode to false and navigate to master page
		 */
		onCloseDetailPress: function () {
			this.getModel("appView").setProperty("/actionButtonsInfo/midColumn/fullScreen", false);
			// No item should be selected on master after detail page is closed
			this.getOwnerComponent().oListSelector.clearMasterListSelection();
			this.getRouter().navTo("master");
		},

		/**
		 * Toggle between full and non full screen mode.
		 */
		toggleFullScreen: function () {
			var bFullScreen = this.getModel("appView").getProperty("/actionButtonsInfo/midColumn/fullScreen");
			this.getModel("appView").setProperty("/actionButtonsInfo/midColumn/fullScreen", !bFullScreen);
			if (!bFullScreen) {
				// store current layout and go full screen
				this.getModel("appView").setProperty("/previousLayout", this.getModel("appView").getProperty("/layout"));
				this.getModel("appView").setProperty("/layout", "MidColumnFullScreen");
			} else {
				// reset to previous layout
				this.getModel("appView").setProperty("/layout", this.getModel("appView").getProperty("/previousLayout"));
			}
		},

		/* =========================================================== */
		/* file uploader methods                                       */
		/* =========================================================== */

		/**
		 * @variable {string} keeps the object id
		 */
		sObjectId: null,

		/** 
		 * is called as soon as the binding change on the file uploader 
		 * @param {sap.ui.base.Event} oEvent the event object that passed by the fire function 
		 */
		onModelContextChange: function (oEvent) {
			var oUploadCollection = oEvent.getSource(),
				sObjectId = oUploadCollection.data("myObjectId");
			if (this.sObjectId !== sObjectId) {
				this.sObjectId = sObjectId;
				this.updateFileUploaderFilter();
			} else if (sObjectId === null) {
				this.updateFileUploaderFilter();
			}
		},

		/** 
		 * method to get UploadCollection of block controller
		 * @returns {UploadCollection} UploadCollection of current view
		 */
		getFileUploaderObject: function () {
			return this.getView().byId("UploadCollection1");
		},

		/** 
		 * method to get SearchField of block controller
		 * @returns {SearchField} SearchField current of current view
		 */
		getSearchFieldObject: function () {
			return this.getView().byId("searchField1");
		},

		/** 
		 * is called as soon as the binding change on the file uploader 
		 * @param {sap.ui.base.Event} oEvent the event object that passed by the fire function 
		 */
		onUploadCollectionModelContextChange: function (oEvent) {
			var oUploadCollection = oEvent.getSource(),
				sObjectId = oUploadCollection.data("myObjectId");
			if (this.sObjectId !== sObjectId) {
				this.sObjectId = sObjectId;
				this.updateFileUploaderFilter();
			} else if (sObjectId === null) {
				this.updateFileUploaderFilter();
			}
		},

		/** 
		 * is called as soon as user presses the refresh/cancel button, and it would refresh the view.
		 * @param {sap.ui.base.Event} oEvent the event object that passed to this event handler
		 */
		onCancelBtnPressed: function (oEvent) {
			this.getView().getElementBinding().refresh(false);
			let aUploadCollections = this.getAllVisibleUploadCollections();
			for (let indx in aUploadCollections) { // eslint-disable-line
				let oUploadCollection = aUploadCollections[indx];
				this.refreshUplodCollection(oUploadCollection);
			}
		},

		/** 
		 * is called as soon as user presses the save button, and it would save the changes
		 * @param {sap.ui.base.Event} oEvent the event object that passed to this event handler
		 */
		onSaveBtnPressed: function (oEvent) {
			this.startAppBusy();
			let oBundle = this.getResourceBundle();
			if (!this.saveFiles()) {
				MessageToast.show(oBundle.getText("noChangeMessage"));
			}
		},

		/** 
		 * method to save the changes on all file uploader collections 
		 * @returns {boolean} true if there is any changes, false otherwise
		 */
		saveFiles: function () {
			let oBundle = this.getResourceBundle();
			let oDialog = Utils.showEmptyDialog(this, oBundle.getText("base_fileStatusDialogTitle"));
			let fnThen = () => {
				oDialog.close();
				this.stopAppBusy();
			};
			let fnCatch = () => {
				oDialog.getBeginButton().setVisible(true);
				this.getView().getElementBinding().refresh(false);
				this.stopAppBusy();
				MessageToast.show(oBundle.getText("fileUploader_ErrorFileProcess"));
			};
			let aUploadCollections = this.getAllVisibleUploadCollections();
			let aPromises = [];
			for (let indx in aUploadCollections) { // eslint-disable-line
				if (this.isUploadCollectionChanged(aUploadCollections[indx])) {
					oDialog.open();
					aPromises.push(this.submitFileChanges(aUploadCollections[indx], oDialog));
				}
			}
			Promise.all(aPromises).then(fnThen).catch(fnCatch);
			if (aPromises.length === 0) {
				return false;
			} else {
				return true;
			}
		}
	});

});