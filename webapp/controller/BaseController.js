sap.ui.define([
	"sap/ui/core/mvc/Controller",
	"sap/ui/core/routing/History",
	"sap/ui/model/Filter",
	"sap/ui/model/FilterOperator",
	"sap/ui/unified/FileUploaderParameter",
	"sap/m/UploadCollectionParameter",
	"sap/m/PDFViewer",
	"sap/m/ObjectStatus",
	"sap/m/MessageToast",
	"sap/base/Log",
	"../js/Utils"
	// eslint-disable-next-line max-params
], function (Controller, History, Filter, FilterOperator, FileUploaderParameter, UploadCollectionParameter, PDFViewer, ObjectStatus,
	MessageToast, Log, Utils) {
	"use strict";

	return Controller.extend("com.mjzsoft.FileUploader0Manual.controller.BaseController", {

		/**
		 * An array that keeps a reference for to all dialogs,
		 * to destroy them at the `Exit` event!
		 * @variable {Array}
		 * @private
		 */
		_aDialogs: [],

		/**
		 * A set that keeps a reference to all the FieldGroupsIds in each of object and detail views
		 * @variable {Array}
		 * @private
		 */
		_stFieldGroupIds: ["detailsPageFields"],

		/**
		 * Convenience method for accessing the router in every controller of the application.
		 * @public
		 * @returns {sap.ui.core.routing.Router} the router for this component
		 */
		getRouter: function () {
			return this.getOwnerComponent().getRouter();
		},

		/**
		 * Convenience method for getting the view model by name in every controller of the application.
		 * @public
		 * @param {string} sName the model name
		 * @returns {sap.ui.model.Model} the model instance
		 */
		getModel: function (sName) {
			return this.getView().getModel(sName);
		},

		/**
		 * Convenience method for setting the view model in every controller of the application.
		 * @public
		 * @param {sap.ui.model.Model} oModel the model instance
		 * @param {string} sName the model name
		 * @returns {sap.ui.mvc.View} the view instance
		 */
		setModel: function (oModel, sName) {
			return this.getView().setModel(oModel, sName);
		},

		/**
		 * Convenience method for getting the resource bundle.
		 * @public
		 * @returns {sap.ui.model.resource.ResourceModel} the resourceModel of the component
		 */
		getResourceBundle: function () {
			return this.getOwnerComponent().getModel("i18n").getResourceBundle();
		},

		/**
		 * Event handler for navigating back.
		 * It there is a history entry we go one step back in the browser history
		 * If not, it will replace the current entry of the browser history with the master route.
		 * @public
		 */
		onNavBack: function () {
			var sPreviousHash = History.getInstance().getPreviousHash();

			if (sPreviousHash !== undefined) {
				// eslint-disable-next-line sap-no-history-manipulation
				history.go(-1);
			} else {
				this.getRouter().navTo("master", {}, true);
			}
		},

		/* =========================================================== */
		/* File Uploader                        					   */
		/* =========================================================== */

		/** 
		 * Gets and entity and delete redundant data from that to pass 
		 * @function
		 * @public
		 * @param {object} oEntity the entity to modify 
		 * @param {string} sEntityType the entity type name
		 * @returns {object} the cleaned copy of the entity 
		 */
		getBatchObject: function (oEntity, sEntityType) {
			var oData = jQuery.extend({}, oEntity),
				fnRemoveUndefineds = function () {
					for (var sKey in oData) {
						if (oData[sKey] === undefined) {
							oData[sKey] = "";
						}
					}
				};
			var aDates = [];
			delete oData.__metadata;
			if (sEntityType === "DocumentFile") {
				fnRemoveUndefineds();
				// if there is any DateTime property in OData, put their name here in this array, to set the empty ones to null instead of empty string!
				aDates = [];
			}
			// Remove empty dates
			for (var i = 0; i < aDates.length; i++) {
				var sCol = aDates[i];
				if (!oData[sCol] || oData[sCol].length === 0) {
					oData[sCol] = null;
				}
			}
			return oData;
		},

		/** 
		 * Gets the groupid and returns all the fields 
		 * @function
		 * @public
		 * @param {string} sFieldGroupId the name of the field group of all elements that must be collected.
		 * @param {sap.m.Dialog} oDialog the dialog that wrap the controls if exist 
		 * @returns {sap.ui.core.Control[]} an array of controlls 
		 */
		getFieldsByGroupId: function (sFieldGroupId, oDialog) {
			var aFields = oDialog ? oDialog.getControlsByFieldGroupId(sFieldGroupId) : this.getView().getControlsByFieldGroupId(sFieldGroupId);
			return aFields;
		},

		/**
		 * Convenience method for getting the app view model.
		 * @public
		 * @returns {sap.ui.model.Model} the appView model instance
		 */
		getAppViewModel: function () {
			return this.getOwnerComponent().getModel("appView");
		},

		/** 
		 * Will publish a message on the event bus for starting the busy indicator 
		 * when `AppController` is the view manager.
		 */
		startAppBusy: function () {
			sap.ui.getCore().getEventBus().publish("App", "StartAppBusy", null);
		},

		/** 
		 * Will publish a message on the event bus for stopping the busy indicator 
		 * when `AppController` is the view manager.
		 */
		stopAppBusy: function () {
			sap.ui.getCore().getEventBus().publish("App", "StopAppBusy", null);
		},

		/** 
		 * Collects and return back all the upload collections of a view
		 * @param {sap.m.Dialog} oDialog if the items are in a dialog 
		 * @return {array} an array of collected UploadCollections
		 */
		getAllVisibleUploadCollections: function (oDialog) {
			let aUploadCollections = [],
				aFieldGroupIds = this._stFieldGroupIds;
			for (let i = 0; i < aFieldGroupIds.length; i++) {
				let sFieldGroupId = aFieldGroupIds[i];
				let aFields = this.getFieldsByGroupId(sFieldGroupId, oDialog);
				if (aFields) {
					for (let j = 0; j < aFields.length; j++) {
						let oField = aFields[j];
						let sClass = oField.getVisible() ? oField.getMetadata().getName() : null;
						if (sClass === "sap.m.UploadCollection") {
							aUploadCollections[oField.getId()] = oField;
						}
					}
				}
			}
			return aUploadCollections;
		},

		/** 
		 * Shows a dialog for file delete confirmation 
		 * @param {string} sName the name of the file
		 * @param {function} fnCallBack the call back function 
		 * @return {sap.m.Dialog} the generated dialog 
		 */
		_confirmFileDelition: function (sName, fnCallBack) {
			var oBundle = this.getResourceBundle();
			this._aDialogs[this._aDialogs.length] =
				Utils.showNormalDialog(this,
					oBundle.getText("base_deleteFileDialogTitle"), null, [oBundle.getText("base_deleteFileDialogMsg", [sName])],
					fnCallBack, oBundle.getText("base_CancelBtn"), oBundle.getText("base_OkayBtn"));
			return this._aDialogs[this._aDialogs.length - 1];
		},

		/** 
		 * This  event handler is triggered when user press on Delete buttons of the items,
		 * and the item will be removed from the list. 
		 * This event is related to the item that are already uploaded. 
		 * @param {sap.ui.base.Event} oEvent pattern match event in deletePress
		 */
		onUploadCollectionItemDeletePress: function (oEvent) {
			var oUploadCollectionItem = oEvent.getSource(),
				oUploadCollection = oUploadCollectionItem.getParent(),
				sName = oUploadCollectionItem.getFileName();
			if (oUploadCollection._aDeletedItemForPendingDelete === undefined) {
				oUploadCollection._aDeletedItemForPendingDelete = [];
			}
			this._confirmFileDelition(sName, () => {
				var sDocumentnumber = oUploadCollectionItem.data("myDocumentnumber");
				oUploadCollectionItem._documentnumber = sDocumentnumber;
				oUploadCollection._aDeletedItemForPendingDelete.push(oUploadCollectionItem);
				oUploadCollection.removeItem(oUploadCollectionItem);
				oUploadCollectionItem.destroy(true);
				var oSearchField = this._getSearchFieldObject(oUploadCollection);
				if (oSearchField) {
					oSearchField.setEnabled(false);
				}
				this._uploadCollectionEnabilityChanged(oUploadCollection);
				this.getAppViewModel().setProperty("/someDataChanged", true);
			});
		},

		/** 
		 * This function tells if something is waiting for submission 
		 * @param {sap.m.UploadCollection} oUploadCollection the intended uploadCollection
		 * @return {boolean} true if something is waiting for submission to back-end, false otherwise
		 */
		isUploadCollectionChanged: function (oUploadCollection) {
			if (!oUploadCollection) {
				return false;
			}
			if (oUploadCollection._aDeletedItemForPendingDelete && oUploadCollection._aDeletedItemForPendingDelete.length > 0) {
				return true;
			} else if (oUploadCollection._aFileUploadersForPendingUpload && oUploadCollection._aFileUploadersForPendingUpload.length > 0) {
				return true;
			} else {
				let aUploadCollectionItems = oUploadCollection.getItems();
				for (let i in aUploadCollectionItems) { // eslint-disable-line
					let oUploadCollectionItem = aUploadCollectionItems[i];
					if (oUploadCollectionItem._status !== "pendingUploadStatus" && oUploadCollectionItem._bRenamed) {
						return true;
					}
				}
			}
			return false;
		},

		/** 
		 * This function is called when user press on save button 
		 * @param {sap.m.UploadCollection} oUploadCollection the intended uploadCollection
		 * @param {sap.m.Dialog} oDialog the dialog that wrap the status messages  
		 * @return {promise} a promise that will be resolved when all get successed
		 */
		submitFileChanges: function (oUploadCollection, oDialog) {
			return new Promise((resolve, reject) => {
				if (oUploadCollection._iNumberOfDeleteRequests > 0 || oUploadCollection._iNumberOfRenameRequests > 0 || oUploadCollection._iNumberOfUploadRequests >
					0) {
					Log.error("Wait until the current files uploaded");
					reject();
				}
				this.getAppViewModel().setProperty("/uploadEnabled", false);
				let oDataModel = this.getView().getModel("filesModel");
				let fnThen = () => {
					this.getAppViewModel().setProperty("/uploadEnabled", true);
					oDataModel.setDeferredGroups(["changes"]);
					oDataModel.setRefreshAfterChange(true);
					this.refreshUplodCollection(oUploadCollection);
					resolve();
				};
				let fnCatch = () => {
					this.getAppViewModel().setProperty("/uploadEnabled", true);
					oDataModel.setDeferredGroups(["changes"]);
					oDataModel.setRefreshAfterChange(true);
					reject();
				};
				let p1 = this._submitFileDeletes(oUploadCollection, oDialog),
					p2 = this._submitFileRenames(oUploadCollection, oDialog),
					p3 = this._submitFileUploads(oUploadCollection, oDialog);
				Promise.all([p1, p2, p3]).then(() => {
					fnThen();
				}).catch(() => {
					fnCatch();
				});
			});
		},

		/** 
		 * This function tries to submit delete requests
		 * @param {sap.m.UploadCollection} oUploadCollection the intended uploadCollection
		 * @param {sap.m.Dialog} oDialog the dialog that wrap the status messages  
		 * @return {promise} a promise that will be resolved when all get successed
		 */
		_submitFileDeletes: function (oUploadCollection, oDialog) {
			return new Promise((resolve, reject) => {
				let oBundle = this.getResourceBundle(),
					oDataModel = this.getView().getModel("filesModel"),
					sObjectId = oUploadCollection.data("myObjectId"),
					sObjectType = oUploadCollection.data("myObjectType"),
					sDocumentType = oUploadCollection.data("myDocumentType");
				// make the file model batch enabled 
				let sGroupId = "mjzsoft_file_removes" + new Date().getTime();
				oDataModel.setUseBatch(true);
				oDataModel.setRefreshAfterChange(false);
				oDataModel.setDeferredGroups([sGroupId]);
				// Submit delete requests
				let aDeletedFiles = oUploadCollection._aDeletedItemForPendingDelete;
				oUploadCollection._iNumberOfDeleteRequests = aDeletedFiles ? aDeletedFiles.length : 0;
				oUploadCollection._iNumberOfFailedDeleteRequests = 0;
				for (let i in aDeletedFiles) { // eslint-disable-line
					let oUploadCollectionItem = aDeletedFiles[i],
						sFileId = oUploadCollectionItem.getDocumentId(),
						sFileName = oUploadCollectionItem.getFileName(),
						sDocumentnumber = oUploadCollectionItem._documentnumber;
					let sFilePath = "/" + oDataModel.createKey("DocObjFileSet", {
						Objecttype: encodeURIComponent(sObjectType),
						Objectkey: encodeURIComponent(sObjectId),
						Documenttype: encodeURIComponent(sDocumentType),
						Documentnumber: encodeURIComponent(sDocumentnumber),
						FileId: encodeURIComponent(sFileId)
					});
					//
					let oVbox = new sap.m.VBox();
					if (oDialog) {
						oDialog.addContent(oVbox);
					}
					oVbox.addItem(new ObjectStatus({
						icon: "sap-icon://delete",
						tooltip: oBundle.getText("base_Deleting"),
						text: sFileName
					}));
					let oStatus = new ObjectStatus({
						title: oBundle.getText("base_Status"),
						text: "0%"
					});
					oVbox.addItem(oStatus);
					oVbox.addStyleClass("mjzsoftVBoxItem");
					//
					let sChangeSetId = "mjzsoft_file_remove" + new Date().getTime() + "_" + i;
					oDataModel.remove(sFilePath, {
						groupId: sGroupId,
						changeSetId: sChangeSetId,
						success: function (_oStatus, _oUploadCollectionItem, oData, oResponse) {
							_oStatus.setText(oBundle.getText("base_Deleted"));
							oUploadCollection._iNumberOfDeleteRequests--;
							if (oUploadCollection._iNumberOfDeleteRequests === 0) {
								if (oUploadCollection._iNumberOfFailedDeleteRequests === 0) {
									resolve();
								} else {
									reject();
								}
							}
							for (let j in aDeletedFiles) {
								if (_oUploadCollectionItem === aDeletedFiles[j]) {
									aDeletedFiles.splice(j, 1);
									break;
								}
							}
						}.bind(this, oStatus, oUploadCollectionItem),
						error: function (_oStatus, oError) {
							_oStatus.setText(oBundle.getText("base_Failed"));
							oUploadCollection._iNumberOfDeleteRequests--;
							oUploadCollection._iNumberOfFailedDeleteRequests++;
							if (oUploadCollection._iNumberOfDeleteRequests === 0) {
								reject();
							}
						}.bind(this, oStatus)
					});
				}
				if (oUploadCollection._iNumberOfDeleteRequests === 0) {
					resolve();
				} else {
					oDataModel.submitChanges({
						groupId: sGroupId
					});
				}
			});
		},

		/** 
		 * This function tries to submit rename requests
		 * @param {sap.m.UploadCollection} oUploadCollection the intended uploadCollection
		 * @param {sap.m.Dialog} oDialog the dialog that wrap the status messages  
		 * @return {promise} a promise that will be resolved when all get successed
		 */
		_submitFileRenames: function (oUploadCollection, oDialog) {
			return new Promise((resolve, reject) => {
				let oBundle = this.getResourceBundle(),
					oDataModel = this.getView().getModel("filesModel"),
					sObjectId = oUploadCollection.data("myObjectId"),
					sObjectType = oUploadCollection.data("myObjectType"),
					sDocumentType = oUploadCollection.data("myDocumentType");
				// make the file model batch enabled 
				let sGroupId = "mjzsoft_file_renames" + new Date().getTime();
				oDataModel.setUseBatch(true);
				oDataModel.setRefreshAfterChange(false);
				oDataModel.setDeferredGroups([sGroupId]);
				// submit change name requests
				let aUploadCollectionItems = oUploadCollection.getItems();
				oUploadCollection._iNumberOfRenameRequests = 0;
				oUploadCollection._iNumberOfFailedRenameRequests = 0;
				for (let i in aUploadCollectionItems) { // eslint-disable-line
					let oUploadCollectionItem = aUploadCollectionItems[i];
					if (oUploadCollectionItem._status !== "pendingUploadStatus" && oUploadCollectionItem._bRenamed) {
						oUploadCollection._iNumberOfRenameRequests++;
						let sFileId = oUploadCollectionItem.getDocumentId(),
							sFileName = oUploadCollectionItem.getFileName(),
							sDocumentnumber = oUploadCollectionItem.data("myDocumentnumber"),
							sFilePath = "/" + oDataModel.createKey("DocObjFileSet", {
								Objecttype: encodeURIComponent(sObjectType),
								Objectkey: encodeURIComponent(sObjectId),
								Documenttype: encodeURIComponent(sDocumentType),
								Documentnumber: encodeURIComponent(sDocumentnumber),
								FileId: encodeURIComponent(sFileId)
							});
						let oFile = oDataModel.getProperty(sFilePath);
						oFile = this.getBatchObject(oFile, "DocObjFile");
						oFile.FileName = sFileName;
						//
						let oVbox = new sap.m.VBox();
						if (oDialog) {
							oDialog.addContent(oVbox);
						}
						oVbox.addItem(new ObjectStatus({
							icon: "sap-icon://write-new-document",
							tooltip: oBundle.getText("base_Renaming"),
							text: sFileName
						}));
						let oStatus = new ObjectStatus({
							title: oBundle.getText("base_Status"),
							text: "0%"
						});
						oVbox.addItem(oStatus);
						oVbox.addStyleClass("mjzsoftVBoxItem");
						// only PUT is working to update file
						oDataModel.sDefaultUpdateMethod = "PUT";
						let sChangeSetId = "mjzsoft_file_rename" + new Date().getTime() + "_" + i;
						oDataModel.update(sFilePath, oFile, {
							groupId: sGroupId,
							changeSetId: sChangeSetId,
							success: function (_oStatus, _oUploadCollectionItem) {
								_oStatus.setText(oBundle.getText("base_Renamed"));
								oUploadCollection._iNumberOfRenameRequests--;
								if (oUploadCollection._iNumberOfRenameRequests === 0) {
									if (oUploadCollection._iNumberOfFailedRenameRequests === 0) {
										resolve();
									} else {
										reject();
									}
								}
								_oUploadCollectionItem._bRenamed = false;
							}.bind(this, oStatus, oUploadCollectionItem),
							error: function (_oStatus) {
								_oStatus.setText(oBundle.getText("base_Failed"));
								oUploadCollection._iNumberOfRenameRequests--;
								oUploadCollection._iNumberOfFailedRenameRequests++;
								if (oUploadCollection._iNumberOfRenameRequests === 0) {
									reject();
								}
							}.bind(this, oStatus)
						});
					}
				}
				if (oUploadCollection._iNumberOfRenameRequests === 0) {
					resolve();
				} else {
					oDataModel.submitChanges({
						groupId: sGroupId
					});
				}
			});
		},

		/** 
		 * This function tries to submit upload requests
		 * @param {sap.m.UploadCollection} oUploadCollection the intended uploadCollection
		 * @param {sap.m.Dialog} oDialog the dialog that wrap the status messages  
		 * @return {promise} a promise that will be resolved when all get successed
		 */
		_submitFileUploads: function (oUploadCollection, oDialog) {
			return new Promise((resolve, reject) => {
				let oBundle = this.getResourceBundle(),
					oDataModel = this.getView().getModel("filesModel"),
					sObjectId = oUploadCollection.data("myObjectId"),
					sObjectType = oUploadCollection.data("myObjectType"),
					sDocumentType = oUploadCollection.data("myDocumentType");
				// make the file model batch enabled 
				let sGroupId = "mjzsoft_file_renames" + new Date().getTime();
				oDataModel.setUseBatch(true);
				oDataModel.setRefreshAfterChange(false);
				oDataModel.setDeferredGroups([sGroupId]);
				// submit change name requests
				let aFileUploaders = oUploadCollection._aFileUploadersForPendingUpload;
				oUploadCollection._iNumberOfUploadRequests = aFileUploaders ? aFileUploaders.length : 0;
				oUploadCollection._iNumberOfFailedUploadRequests = 0;
				if (oUploadCollection._iNumberOfUploadRequests === 0) {
					resolve();
					return;
				}
				for (let i in aFileUploaders) { // eslint-disable-line
					let oFileUploader = aFileUploaders[i],
						sFileName = oFileUploader.getFileName(),
						token = oDataModel.getSecurityToken();
					let sSlug = "***" + encodeURIComponent(sFileName) +
						"***" + encodeURIComponent(sObjectType) +
						"***" + encodeURIComponent(sObjectId) +
						"***" + encodeURIComponent(sDocumentType) +
						"***";
					oFileUploader.addHeaderParameter(new FileUploaderParameter({
						name: "SLUG",
						value: sSlug
					}));
					oFileUploader.addHeaderParameter(new FileUploaderParameter({
						name: "x-csrf-token",
						value: token
					}));
					// set suitable mime type for emails
					if (sFileName.endsWith("msg")) {
						oFileUploader.addHeaderParameter(new FileUploaderParameter({
							name: "Content-Type",
							value: "application/vnd.ms-outlook"
						}));
					}
					let oUploadCollectionItem = oFileUploader.getUploadCollectionItem();
					oUploadCollectionItem.removeAllStatuses();
					let oVbox = new sap.m.VBox();
					if (oDialog) {
						oDialog.addContent(oVbox);
					}
					oVbox.addItem(new ObjectStatus({
						icon: "sap-icon://upload",
						tooltip: oBundle.getText("base_Uploading"),
						text: sFileName
					}));
					let oStatus = new ObjectStatus({
						title: oBundle.getText("base_Uploaded"),
						text: "0%",
						customData: [{
							Type: "sap.ui.core.CustomData",
							key: "uploading",
							value: true
						}]
					});
					oStatus._childStatus = new ObjectStatus({
						title: oBundle.getText("base_Status"),
						text: "0%"
					});
					oVbox.addItem(oStatus._childStatus);
					oVbox.addStyleClass("mjzsoftVBoxItem");
					oUploadCollectionItem.insertStatus(oStatus, 0);
					oFileUploader.attachUploadProgress((oEvent) => {
						let _oFileUploader = oEvent.getSource();
						//let _oUploadCollectionItem = _oFileUploader.getUploadCollectionItem();
						let _oStatus = _oFileUploader.getUploadCollectionItem().getStatuses()[0];
						let fLoaded = oEvent.getParameter("loaded").toFixed(2);
						let fTotal = oEvent.getParameter("total").toFixed(2);
						let iVal = Math.floor(100 * fLoaded / fTotal);
						let sVal = iVal + "%";
						if (_oStatus) {
							_oStatus.setText(sVal);
							if (_oStatus._childStatus) {
								_oStatus._childStatus.setText(sVal);
							}
						}
						if (iVal === 100) {
							if (_oStatus) {
								_oStatus.setText(sVal + " " + oBundle.getText("base_Done"));
								if (_oStatus._childStatus) {
									_oStatus._childStatus.setText(oBundle.getText("base_Uploaded"));
								}
							}
						}
					});
					oFileUploader.attachUploadComplete(function (_oStatus, oEvent) {
						let _oFileUploader = oEvent.getSource();
						let iStatus = oEvent.getParameter("status");
						oUploadCollection._iNumberOfUploadRequests--;
						if (iStatus > 299) { // means anytype of failure
							oUploadCollection._iNumberOfFailedUploadRequests++;
							if (_oStatus) {
								_oStatus.setText(oBundle.getText("base_Failed"));
								if (_oStatus._childStatus) {
									_oStatus._childStatus.setText(oBundle.getText("base_Failed"));
								}
							}
						}
						// remove the pending fileUploader
						// as its oUploaderCollectionItem will be removed, 
						// even in case of failure we must remove the uploader
						for (let j in oUploadCollection._aFileUploadersForPendingUpload) {
							if (oUploadCollection._aFileUploadersForPendingUpload[j] === _oFileUploader) {
								oUploadCollection._aFileUploadersForPendingUpload.splice(j, 1);
								_oFileUploader.destroy(true);
								oUploadCollectionItem.destroy(true);
								break;
							}
						}
						// check shall we reject or resolve 
						if (oUploadCollection._iNumberOfUploadRequests === 0) {
							if (oUploadCollection._iNumberOfFailedUploadRequests === 0) {
								resolve();
							} else {
								reject();
							}
						}
					}.bind(this, oStatus));
					oFileUploader.attachUploadAborted((oEvent) => {
						oUploadCollection._iNumberOfUploadRequests--;
						if (oUploadCollection._iNumberOfUploadRequests === 0) {
							if (oUploadCollection._iNumberOfFailedUploadRequests === 0) {
								resolve();
							} else {
								reject();
							}
						}
					});
					if (!oFileUploader.wasDragAndDrop()) {
						oFileUploader.upload();
					} else {
						oFileUploader._sendFilesFromDragAndDrop([oFileUploader._relatedFile]);
					}
				}
			});
		},

		/** 
		 * Change event triggered for UploadCollection as soon as user add a new file.
		 * This event handler will make a connection between fileUploader and UploaderItem in the view,
		 * Also attaches the delete handler for the uploaderItem. 
		 * @param {sap.ui.base.Event} oEvent pattern match event in change
		 */
		onUploadCollectionChange: function (oEvent) {
			this.startAppBusy();
			this.getAppViewModel().setProperty("/someDataChanged", true);
			var oDataModel = this.getView().getModel("filesModel");
			var oUploadCollection = oEvent.getSource();
			oUploadCollection.setUploadButtonInvisible(true);
			var aFiles = oEvent.getParameter("files");
			var bDragAndDrop = Array.isArray(aFiles); // true if D&D
			var sPossibleName = this._getNextPossibleName(oUploadCollection, aFiles[0].name);
			var sUploadUrl = oDataModel.sServiceUrl + "/DocumentFileSet";
			// Disable search 
			var oSearchField = this._getSearchFieldObject(oUploadCollection);
			if (oSearchField) {
				oSearchField.setEnabled(false);
			}
			// Check when the uploader instance is ready 
			var iLength = oUploadCollection._aFileUploadersForPendingUpload.length;
			new Promise((resolve, reject) => {
					var iTimeout = 2048,
						iCounter = 0;
					var isItemReady = () => {
						var iNewLength = oUploadCollection._aFileUploadersForPendingUpload.length;
						if (iNewLength > iLength) {
							let oUploadCollectionItem = oUploadCollection.getItems()[0];
							oUploadCollectionItem.unbindProperty("fileName", false);
							oUploadCollectionItem.setFileName(sPossibleName);
							let oFileUploader = oUploadCollection._aFileUploadersForPendingUpload[iLength];
							oFileUploader.setUploadUrl(sUploadUrl);
							oFileUploader.setName(sPossibleName);
							oFileUploader.getFileName = () => oUploadCollectionItem.getFileName();
							oFileUploader.getUploadCollectionItem = () => oUploadCollectionItem;
							if (bDragAndDrop) {
								oFileUploader.wasDragAndDrop = () => true;
								var i = oUploadCollection._aFilesFromDragAndDropForPendingUpload.length - 1;
								oFileUploader._relatedFile = oUploadCollection._aFilesFromDragAndDropForPendingUpload[i];
							} else {
								oFileUploader.wasDragAndDrop = () => false;
								oFileUploader._relatedFile = null;
							}
							this.stopAppBusy();
							resolve(oUploadCollectionItem);
						} else if (iCounter < 20) {
							iCounter++;
							iTimeout /= 2;
							window.setTimeout(isItemReady.bind(this), iTimeout); // eslint-disable-line
						} else {
							this.stopAppBusy();
							reject();
						}
					};
					isItemReady();
				}).then((oUploadCollectionItem) => {
					// check for upload enablity as soon as item is available
					let _oUploadCollection = oUploadCollectionItem.getParent();
					this._uploadCollectionEnabilityChanged(_oUploadCollection);
					// What must do when delete press?
					oUploadCollectionItem.attachDeletePress((_oEvent) => {
						var _oUploadCollectionItem = _oEvent.getSource(),
							__oUploadCollection = _oUploadCollectionItem.getParent(),
							sName = _oUploadCollectionItem.getFileName();
						this._confirmFileDelition(sName, () => {
							oUploadCollection.removeItem(_oUploadCollectionItem);
							var oFileUploader = sap.ui.getCore().byId(oUploadCollectionItem.getFileUploader());
							var aStatus = _oUploadCollectionItem.getStatuses();
							if (aStatus.length > 0 && aStatus[0].data("uploading") === true) {
								oFileUploader.abort();
							}
							for (var i in oUploadCollection._aFileUploadersForPendingUpload) {
								if (oUploadCollection._aFileUploadersForPendingUpload[i] === oFileUploader) {
									oUploadCollection._aFileUploadersForPendingUpload.splice(i, 1);
									oFileUploader.destroy(true);
									break;
								}
							}
							for (var j in oUploadCollection._aDeletedItemForPendingUpload) {
								if (oUploadCollection._aDeletedItemForPendingUpload[j] === _oUploadCollectionItem) {
									oUploadCollection._aDeletedItemForPendingUpload.splice(j, 1);
									_oUploadCollectionItem.destroy(true);
									// No break please, sometimes there are more than one instance
								}
							}
							if (oUploadCollection._aFileUploadersForPendingUpload.length === 0) {
								var _oSearchField = this._getSearchFieldObject(oUploadCollection);
								if (_oSearchField) {
									_oSearchField.setEnabled(true);
								}
							}
							this._uploadCollectionEnabilityChanged(__oUploadCollection);
						});
					});
					// Open the dialog for changing the name
					this._openRenameDialog(oUploadCollectionItem);
					oUploadCollection.setUploadButtonInvisible(false);
				}) // End of then function
				.catch(() => {
					oUploadCollection.setUploadButtonInvisible(false);
				});
		},

		/** 
		 * too big file exception by UploadCollection
		 * @param {sap.ui.base.Event} oEvent pattern match event
		 */
		onFileSizeExceed: function (oEvent) {
			MessageToast.show(this.getResourceBundle().getText("fileUploader_ErrorMaxSize"));
		},

		/** 
		 * too big file name length exception by UploadCollection
		 * @param {sap.ui.base.Event} oEvent pattern match event
		 */
		onFilenameLengthExceed: function (oEvent) {
			MessageToast.show(this.getResourceBundle().getText("fileUploader_ErrorMaxFileNameSize"));
		},

		/** 
		 * not supported format error
		 * @param {sap.ui.base.Event} oEvent pattern match event
		 */
		onTypeMissmatch: function (oEvent) {
			MessageToast.show(this.getResourceBundle().getText("fileUploader_ErrorFormatSupport"));
		},

		/** 
		 * Updates the oUploadCollection elements 
		 * @param {sap.m.UploadCollection} oUploadCollection the intended uploadCollection
		 */
		refreshUplodCollection: function (oUploadCollection) {
			oUploadCollection.getBinding("items").refresh();
			var oSearchField = this._getSearchFieldObject(oUploadCollection);
			if (oSearchField) {
				oSearchField.setEnabled(true);
			}
			oUploadCollection._aDeletedItemForPendingDelete = []; // just make it empty as we made it as a refrence for ourselves 
			for (var i in oUploadCollection._aFileUploadersForPendingUpload) { // eslint-disable-line
				let oFileUploader = oUploadCollection._aFileUploadersForPendingUpload[i];
				let oUploadCollectionItem = oFileUploader.getUploadCollectionItem();
				if (oUploadCollectionItem) {
					oUploadCollectionItem.destroy(true);
				}
				if (oFileUploader) {
					oFileUploader.destroy(true);
				}
			}
			oUploadCollection._aFileUploadersForPendingUpload = [];
			this.getAppViewModel().setProperty("/uploadEnabled", true);
		},

		/** 
		 * configures link to download file
		 * @param {string} sFileId the file id
		 * @param {string} sDocumentnumber the document number
		 * @param {string} sDocumenttype the document type 
		 * @param {boolean} bPermission user permission for file reading 
		 * @returns {string|undefined} link for the file
		 */
		getFileUrl: function (sFileId, sDocumentnumber, sDocumenttype, bPermission) {
			var oModel = this.getModel("filesModel"),
				sFilePath = "/" + oModel.createKey("DocumentFileSet", {
					FileId: encodeURIComponent(sFileId),
					Documentnumber: encodeURIComponent(sDocumentnumber),
					Documenttype: encodeURIComponent(sDocumenttype)
				}),
				sDownloadLink = oModel.sServiceUrl + sFilePath + "/$value";
			return bPermission ? sDownloadLink : undefined;
		},

		/**
		 * Event handler for the search input box, when its value is changing in time.
		 * Will try to remove the effect of the previous seach if user removes all characters and forgets to press enter key! 
		 * @param {sap.ui.base.Event} oEvent the search input `liveChange` event
		 * @public
		 */
		onSearchFileLiveChange: function (oEvent) {
			if (oEvent.getParameters().newValue.length === 0) {
				this.onSearchFile(oEvent);
			}
		},

		/** 
		 * filter the files based on the passed query string
		 * @param {sap.ui.base.Event} oEvent pattern match event
		 */
		onSearchFile: function (oEvent) {
			var oSearchFiled = oEvent.getSource(),
				oUploadCollection = oSearchFiled.data("myTarget");
			var aFilters = [],
				sQuery = oEvent.getParameter("query");
			if (sQuery && sQuery.length > 0) {
				aFilters.push(new Filter("FileName", FilterOperator.Contains, sQuery));
			}
			oUploadCollection.getBinding("items").filter(aFilters, "Application");
		},

		/** 
		 * abstract method to get UploadCollection of block controller
		 * @returns {UploadCollection} UploadCollection of current view
		 */
		getFileUploaderObject: function () {
			return null;
		},

		/** 
		 * abstract method to get SearchField of block controller
		 * @returns {SearchField} SearchField current of current view
		 */
		getSearchFieldObject: function () {
			return null;
		},

		/** 
		 * It tries to find the search field in the toolbar of passed uploadCollection
		 * @param {sap.m.UploadCollection} oUploadCollection intended oUploadCollection object
		 * @returns {sap.m.SearchField} SearchField of passed UploadCollection
		 */
		_getSearchFieldObject: function (oUploadCollection) {
			var oToolbar = oUploadCollection.getToolbar(),
				aControls = oToolbar.getContent();
			for (var i in aControls) {
				if (aControls[i].getMetadata().getName() === "sap.m.SearchField") {
					return aControls[i];
				}
			}
			return null;
		},

		/** 
		 * It tries to find the title in the toolbar of passed uploadCollection
		 * @param {sap.m.UploadCollection} oUploadCollection intended oUploadCollection object
		 * @returns {sap.m.Title} Title of passed UploadCollection
		 */
		_getTitleObject: function (oUploadCollection) {
			var oToolbar = oUploadCollection.getToolbar();
			if (oToolbar) {
				var aControls = oToolbar.getContent();
				for (var i in aControls) {
					if (aControls[i].getMetadata().getName() === "sap.m.Title") {
						return aControls[i];
					}
				}
			}
			return null;
		},

		/** 
		 * Is called when it is needed to filter the file list
		 */
		updateFileUploaderFilter: function () {
			var oUploadCollection = this.getFileUploaderObject(),
				sObjectId = oUploadCollection.data("myObjectId"),
				sObjectType = oUploadCollection.data("myObjectType"),
				sDocumentType = oUploadCollection.data("myDocumentType");
			if (oUploadCollection) {
				var oSearchField = this.getSearchFieldObject();
				oSearchField.data("myTarget", oUploadCollection);
			}
			var aFilters = [];
			aFilters.push(new Filter("Objectkey", FilterOperator.EQ, sObjectId === undefined ? "" : sObjectId));
			aFilters.push(new Filter("Objecttype", FilterOperator.EQ, sObjectType === undefined ? "" : sObjectType));
			aFilters.push(new Filter("Documenttype", FilterOperator.EQ, sDocumentType === undefined ? "" : sDocumentType));
			if (oUploadCollection.getBinding("items")) {
				oUploadCollection.getBinding("items").filter(new Filter({
					filters: aFilters,
					and: true
				}));
			}
		},

		/** 
		 * opens viewer to show clicked file
		 * @param {sap.ui.base.Event} oEvent pattern match event
		 */
		onViewFileLinkPressed: function (oEvent) {
			var getUrl = window.location,
				baseUrl = getUrl.protocol + "//" + getUrl.host + "",
				oUploadCollectionItem = oEvent.getSource(),
				sUrl = baseUrl + oUploadCollectionItem.data("url"),
				sName = oUploadCollectionItem.data("name");
			if (!this._pdfViewer) {
				this._pdfViewer = new PDFViewer();
			}
			this._pdfViewer.setSource(sUrl);
			this._pdfViewer.setTitle(sName);
			this._pdfViewer.open();
		},

		/** 
		 * Generates and return a delegate for the file uploader
		 * @return {object} Generated delegate
		 */
		_getUploadCollectionEventDelegate: function () {
			if (!this._oUploadCollectionEventDelegate) {
				this._oUploadCollectionEventDelegate = {
					onAfterRendering: (oEvent) => {
						var oUploadCollection = oEvent.srcControl,
							aUploadCollectionItems = oUploadCollection.getItems();
						for (var i in aUploadCollectionItems) { // eslint-disable-line
							var oUploadCollectionItem = aUploadCollectionItems[i];
							oUploadCollectionItem._bRenamed = oUploadCollectionItem._bRenamed ? oUploadCollectionItem._bRenamed : false;
							var sId = "#" + oUploadCollectionItem.getId() + "-cli";
							$(sId).on("click", function (_oUploadCollectionItem, _oEvent) {
								if (
									this.lastClick &&
									_oEvent.timeStamp - this.lastClick < 250 &&
									this.watingClick
								) {
									this.lastClick = 0;
									clearTimeout(this.watingClick);
									if (_oUploadCollectionItem.getEnableEdit()) {
										this._openRenameDialog(_oUploadCollectionItem);
									}
									this.watingClick = null;
								} else {
									this.lastClick = _oEvent.timeStamp;
									this.watingClick = setTimeout(() => { // eslint-disable-line
										this.watingClick = null;
										//Do nothing
									}, 251);
								}
							}.bind(this, oUploadCollectionItem));
						}
						var oTitle = this._getTitleObject(oUploadCollection);
						if (oTitle) {
							var oBundle = this.getResourceBundle();
							oTitle.setText(oBundle.getText(oTitle.getBinding("text").getPath(), [aUploadCollectionItems.length]));
						}
					}
				};
			}
			return this._oUploadCollectionEventDelegate;
		},

		/** 
		 * Is Fired as soon as items in the file uploader are generated.
		 * It will bind double click event handler to uploade items. 
		 * @param {sap.ui.base.Event} oEvent pattern match event
		 */
		onUploadCollectionItemModelContextChange: function (oEvent) {
			var oSource = oEvent.getSource(),
				oUploadCollection = oSource.getParent();
			if (oUploadCollection && oUploadCollection.getMetadata().getName() === "sap.m.UploadCollection") {
				let oDelegate = this._getUploadCollectionEventDelegate();
				oUploadCollection.removeEventDelegate(oDelegate);
				oUploadCollection.addEventDelegate(oDelegate);
				let oBinding = oUploadCollection.getBinding("items");
				if (oBinding) {
					oBinding.detachDataRequested(this._uploadCollectionDataRequested, this);
					oBinding.attachDataRequested(this._uploadCollectionDataRequested.bind(this, oUploadCollection), this);
					oBinding.detachDataReceived(this._uploadCollectionDataReceived, this);
					oBinding.attachDataReceived(this._uploadCollectionDataReceived.bind(this, oUploadCollection), this);
				}
				let oUploadEnabledBinding = oUploadCollection.getBinding("uploadEnabled");
				if (oUploadEnabledBinding) {
					oUploadEnabledBinding.detachChange(this._uploadCollectionEnabilityChanged, this);
					oUploadEnabledBinding.attachChange(this._uploadCollectionEnabilityChanged.bind(this, oUploadCollection), this);
				}
			}
		},

		/** 
		 * Is Fired as soon as data requested in upload collection.
		 * It will makes the upload collection busy.
		 * @param {sap.m.UploadCollection} oUploadCollection Intended upload collection
		 */
		_uploadCollectionDataRequested: function (oUploadCollection) {
			oUploadCollection.setBusy(true);
		},

		/** 
		 * Is Fired as soon as data received in upload collection.
		 * It will makes the upload collection unbusy.
		 * @param {sap.m.UploadCollection} oUploadCollection Intended upload collection
		 * @param {sap.ui.base.Event} oEvent pattern match event
		 */
		_uploadCollectionDataReceived: function (oUploadCollection, oEvent) {
			oUploadCollection.setBusy(false);
			let {
				results
			} = oEvent.getParameter("data");
			let iLength = results.length;
			new Promise((resolve, reject) => {
				var iTimeout = 2048,
					iCounter = 0;
				var isItemReady = () => {
					var iNewLength = oUploadCollection.getItems().length;
					if (iNewLength >= iLength) {
						resolve(oUploadCollection);
					} else if (iCounter < 20) {
						iCounter++;
						iTimeout /= 2;
						window.setTimeout(isItemReady.bind(this), iTimeout); // eslint-disable-line
					} else {
						reject(oUploadCollection);
					}
				};
				isItemReady();
			}).then((_oUploadCollection) => {
				this._uploadCollectionEnabilityChanged(_oUploadCollection);
			}).catch((_oUploadCollection) => { // even in reject case try to check the enability 
				this._uploadCollectionEnabilityChanged(_oUploadCollection);
			});
		},

		/** 
		 * Is Fired as soon as enability is changed on upload collection.
		 * It will makes the upload collection enabled or disabled.
		 * @param {sap.m.UploadCollection} oUploadCollection Intended upload collection
		 */
		_uploadCollectionEnabilityChanged: function (oUploadCollection) {
			var iMaxNumberOfFiles = oUploadCollection.data("maxNumberOfFiles"),
				iNumberOfItems = oUploadCollection.getItems().length;
			if (iMaxNumberOfFiles > 0 && iNumberOfItems >= iMaxNumberOfFiles) {
				oUploadCollection._oFileUploader.setEnabled(false);
				oUploadCollection.setUploadButtonInvisible(true);
				return;
			}
			if (oUploadCollection.data("enabled")) {
				oUploadCollection._oFileUploader.setEnabled(true);
				oUploadCollection.setUploadButtonInvisible(false);
			} else {
				oUploadCollection._oFileUploader.setEnabled(false);
				oUploadCollection.setUploadButtonInvisible(true);
			}
		},

		/** 
		 * Opens a dialog for changing the item's name
		 * @param {sap.m.UploadCollectionItem} oUploadCollectionItem Upload collection item
		 * @return {sap.m.Dialog} the generated dialog
		 */
		_openRenameDialog: function (oUploadCollectionItem) {
			var sFileFullName = oUploadCollectionItem.getFileName();
			var index = sFileFullName.lastIndexOf(".");
			var sFileName = index > 0 ? sFileFullName.substring(0, index) : sFileFullName;
			var sExtension = index > 0 ? sFileFullName.substring(index) : "";
			var oUploadCollection = oUploadCollectionItem.getParent();
			var oSearchField = this._getSearchFieldObject(oUploadCollection);
			var aBlackList = this._getCurrentFilesNames(oUploadCollection);
			var oBundle = this.getResourceBundle();
			// The result of the following line is a regex like this: /^[^~!@#\$%\s\[\]\{\}\\\|§\/&<>\?"€\=\+\^`°]{4,222}$/gim
			// The name can be with its extension maximum 222 characters
			var oRegex = new RegExp("^[^~!@#\\$%\\s\\[\\]\\{\\}\\\\\\|§\\/&<>\\?\"€\\=\\+\\^`°]{" + (sExtension.length + 1) + ",222}$", "img");
			this._aDialogs[this._aDialogs.length] =
				Utils.showInputDialog(this,
					oBundle.getText("base_changeFileNameDialogTitle"), null, sFileName, "", sExtension, aBlackList,
					(sNewFileName) => {
						oUploadCollectionItem.setFileName(sNewFileName);
						oUploadCollectionItem._bRenamed = true;
						if (oSearchField) {
							oSearchField.setEnabled(false);
						}
					}, null, null, oRegex, "customSuggestionsForRenameModel");
			return this._aDialogs[this._aDialogs.length - 1];
		},

		/** 
		 * Extracts the file names that are in use 
		 * @param {sap.m.UploadCollection} oUploadCollection Intended upload collection
		 * @return {array} list of file names
		 */
		_getCurrentFilesNames: function (oUploadCollection) {
			var aList = [];
			var aUploadCollectionItems = oUploadCollection.getItems();
			for (var i in aUploadCollectionItems) { // eslint-disable-line
				aList.push(aUploadCollectionItems[i].getFileName());
			}
			return aList;
		},

		/** 
		 * makes the next possible name for file that have same name 
		 * @param {sap.m.UploadCollection} oUploadCollection Intended upload collection
		 * @param {string} sFileFullName The name that must be checked.
		 * @return {string} the possible name
		 */
		_getNextPossibleName: function (oUploadCollection, sFileFullName) {
			// replace all forbiden characters 
			let sCleanedFileName = sFileFullName.replace(/[~!@#\$%\s\[\]\{\}\\\|§\/&<>\?"€\=\+\^`°]/g, "_");
			let aBlackList = this._getCurrentFilesNames(oUploadCollection);
			if (!aBlackList.includes(sCleanedFileName)) {
				return sCleanedFileName;
			}
			let index = sCleanedFileName.lastIndexOf(".");
			let sFileName = index > 0 ? sCleanedFileName.substring(0, index) : sCleanedFileName;
			let sExtension = index > 0 ? sCleanedFileName.substring(index) : "";
			let i = 1;
			while (i > 0) {
				var sNewName = sFileName + "_(" + i + ")" + sExtension;
				if (!aBlackList.includes(sNewName)) {
					break;
				}
				i++;
			}
			return sNewName;
		}
	});
});