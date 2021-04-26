sap.ui.define([
	"sap/m/Dialog",
	"sap/m/Text",
	"sap/m/Input",
	"sap/m/Button",
	"sap/ui/core/ValueState",
	"sap/m/MessageBox",
	"sap/m/DialogType",
	"sap/m/ButtonType"
], function (Dialog, Text, Input, Button, ValueState, MessageBox, DialogType, ButtonType) {
	"use strict";
	return {

		/** 
		 * Shows a dialog for getting user confirmation 
		 * @function
		 * @public 
		 * @static
		 * @param {sap.ui.core.mvc.Controller} oViewController the controller related to the parent view
		 * @param {string} sTitle the title of the dialog
		 * @param {Array} aMessageVars array of messages 
		 * @param {function} fnCallbackLeft call back function for left button
		 * @param {boolean} bConfirmationDialog boolean value that tells the dialog is of type confirmation or not
		 * @param {function} fnCallbackRight call back function for right button
		 * @param {string} sBtnLeft title of left button
		 * @param {string} sBtnRight title of right button
		 * @returns {sap.m.Dialog} the dialog object
		 */
		showDialog: function (oViewController, sTitle, aMessageVars, fnCallbackLeft, bConfirmationDialog, fnCallbackRight, sBtnLeft, sBtnRight) {
			var oDialog = new Dialog({
				title: sTitle,
				type: DialogType.Message,
				state: bConfirmationDialog ? sap.ui.core.ValueState.Warning : sap.ui.core.ValueState.Success,
				content: new Text({
					text: aMessageVars
				}),
				buttons: [
					new Button({
						text: bConfirmationDialog ? oViewController.getResourceBundle().getText("BtnYes") : sBtnLeft,
						width: bConfirmationDialog ? "45%" : "30%",
						press: function () {
							oDialog.close();
							if (typeof fnCallbackLeft === "function") {
								fnCallbackLeft();
							}
						},
						type: bConfirmationDialog ? ButtonType.Accept : ButtonType.Default
					}),
					new Button({
						text: bConfirmationDialog ? oViewController.getResourceBundle().getText("BtnNo") : sBtnRight,
						width: bConfirmationDialog ? "45%" : "30%",
						press: function () {
							oDialog.close();
							if (typeof fnCallbackRight === "function") {
								fnCallbackRight();
							}
						},
						type: bConfirmationDialog ? ButtonType.Reject : ButtonType.Default
					})
				],
				afterClose: function () {
					oDialog.destroy();
				}
			});
			oDialog.open();
			return oDialog;
		},

		/** 
		 * Show a dialog with two buttons 
		 * @function
		 * @public 
		 * @static
		 * @param {sap.ui.core.mvc.Controller} oViewController the controller related to the parent view
		 * @param {string} sTitle the title of the dialog
		 * @param {sap.ui.core.ValueState} oValueState state of the dialog
		 * @param {Array} aMessageVars array of messages 
		 * @param {function} fnCallback call back function when the user press the end button 
		 * @param {string} sBeginBtnText text of the begin button
		 * @param {string} sEndBtnText text of the end button 
		 * @returns {sap.m.Dialog} the dialog object
		 */
		showNormalDialog: function (oViewController, sTitle, oValueState, aMessageVars, fnCallback, sBeginBtnText, sEndBtnText) {
			var oDialog = new Dialog({
				title: sTitle,
				type: DialogType.Message,
				state: oValueState,
				content: new Text({
					text: aMessageVars
				}),
				buttons: [
					new Button({
						text: sBeginBtnText,
						width: sEndBtnText === "" ? "90%" : "40%",
						press: function () {
							oDialog.close();
						},
						type: ButtonType.Transparent
					}),
					new Button({
						text: sEndBtnText,
						visible: sEndBtnText === "" ? false : true,
						width: "40%",
						press: function () {
							oDialog.close();
							if (typeof fnCallback === "function") {
								fnCallback();
							}
						}
					})
				],
				afterClose: function () {
					oDialog.destroy();
				}
			});
			oDialog.open();
			return oDialog;
		},

		/** 
		 * Shows a dialog for getting user confirmation 
		 * @function
		 * @public 
		 * @static
		 * @param {sap.ui.core.mvc.Controller} oViewController the controller related to the parent view
		 * @param {string} sTitle the title of the dialog
		 * @param {Array} aMessageVars array of messages 
		 * @param {boolean} bSuccess boolean value that tells the dialog is of type success or not
		 * @param {function} fnCallback call back function for OK button
		 */
		showMessageDialog: function (oViewController, sTitle, aMessageVars, bSuccess, fnCallback) {
			MessageBox.show(
				aMessageVars, {
					icon: bSuccess ? MessageBox.Icon.SUCCESS : MessageBox.Icon.ERROR,
					title: sTitle,
					actions: [MessageBox.Action.OK],
					emphasizedAction: MessageBox.Action.OK,
					onClose: function (oAction) {
						if (typeof fnCallback === "function") {
							fnCallback();
						}
					}
				}
			);
		},

		/** 
		 * Show a dialog with two buttons 
		 * @function
		 * @public 
		 * @static
		 * @param {sap.ui.core.mvc.Controller} oViewController the controller related to the parent view
		 * @param {string} sTitle the title of the dialog
		 * @param {sap.ui.core.ValueState} oValueState state of the dialog
		 * @param {string} sValue string of the defualt value 
		 * @param {string} sPreFix an string will be used as default prefix 
		 * @param {string} sPostFix an string will be used as default postfix
		 * @param {array} aBlackList array to check list of not possible values
		 * @param {function} fnCallback call back function when the user press the end button 
		 * @param {string} sBeginBtnText text of the begin button
		 * @param {string} sEndBtnText text of the end button 
		 * @param {string} sValidationRegEx regular expression for validation
		 * @returns {sap.m.Dialog} the dialog object
		 */
		// eslint-disable-next-line max-params
		showInputDialog: function (oViewController, sTitle, oValueState, sValue, sPreFix, sPostFix, aBlackList, fnCallback, sBeginBtnText,
			sEndBtnText, sValidationRegEx, sSuggestionModelName) {
			var oInput = new Input({
				value: sValue
			});
			var _sPreFix = sPreFix ? sPreFix : "";
			var _sPostFix = sPostFix ? sPostFix : "";
			var oDialog = new Dialog({
				title: sTitle,
				type: DialogType.Message,
				state: oValueState,
				content: oInput,
				afterOpen: function () {
					let iSelectionStart = 0,
						iSelectionEnd = oInput.getValue().length;
					oInput.selectText(iSelectionStart, iSelectionEnd);
				},
				afterClose: function () {
					oInput.destroy();
					oDialog.destroy();
				}
			});
			oDialog.setBeginButton(new Button({
				text: sBeginBtnText ? sBeginBtnText : oViewController.getResourceBundle().getText("base_OkayBtn"),
				width: "45%",
				press: function () {
					var sNewValue = _sPreFix + oInput.getValue() + _sPostFix;
					oDialog.close();
					if (typeof fnCallback === "function") {
						fnCallback(sNewValue);
					}
				},
				type: ButtonType.Accept
			}));
			oDialog.setEndButton(new Button({
				text: sEndBtnText ? sEndBtnText : oViewController.getResourceBundle().getText("base_CancelBtn"),
				width: "45%",
				press: function () {
					oDialog.close();
				},
				type: ButtonType.Reject
			}));
			oInput.attachLiveChange(function (oEvent) {
				//replace all spaces with underlines as a convenience function
				var sNewValue = oEvent.getSource().getValue().replaceAll(" ","_");
				if(sNewValue !== oEvent.getSource().getValue()) {
					//get jquery object of inputs inner object to preserve cursor state
					var oInpJQ = $("#" + oEvent.getSource().getId() + "-inner")[0];
					var nSelStart = oInpJQ.selectionStart;
					var nSelEnd = oInpJQ.selectionEnd;
					oEvent.getSource().setValue(sNewValue);
					oInpJQ.selectionStart = nSelStart;
					oInpJQ.selectionEnd = nSelEnd;
				}
				//do Validation
				sNewValue = _sPreFix + sNewValue + _sPostFix;
				let bRegExPassed = true;
				if (sValidationRegEx) {
					bRegExPassed = sNewValue.match(sValidationRegEx) !== null ? true : false;
				}
				if ((aBlackList && aBlackList.includes(sNewValue) || !bRegExPassed) && oEvent.getParameter("newValue") !== sValue) {
					oDialog.getBeginButton().setEnabled(false);
					oInput.setValueState("Error");
				} else {
					oDialog.getBeginButton().setEnabled(true);
					oInput.setValueState("None");
				}
			});
			oInput.onsapenter = ((oEvent) => {
				var sNewValue = _sPreFix + oInput.getValue() + _sPostFix;
				let bRegExPassed = true;
				if (sValidationRegEx) {
					bRegExPassed = sNewValue.match(sValidationRegEx) !== null ? true : false;
				}
				if (((!aBlackList || !aBlackList.includes(sNewValue)) && bRegExPassed) || oInput.getValue() === sValue) {
					oDialog.close();
					if (typeof fnCallback === "function") {
						fnCallback(sNewValue);
					}
				}
			});
			if (sSuggestionModelName) {
				oInput.setShowSuggestion(true);
				oInput.setStartSuggestion(0);
				oInput.setModel(oViewController.getModel(sSuggestionModelName), sSuggestionModelName);
				oInput.bindAggregation("suggestionItems", {
					path: sSuggestionModelName + "/data",
					template: new sap.ui.core.Item({
						key: "{" + sSuggestionModelName + ">text}",
						text: "{" + sSuggestionModelName + ">text}"
					})
				});

				/*
				var aData = oViewController.getModel(sSuggestionModelName).getData().data;
				aData.forEach((oSuggElem) => {
					oInput.addSuggestionItem(new sap.ui.core.Item({key: oSuggElem.text,text: oSuggElem.text}));
				});
				*/
			}

			oDialog.open();
			return oDialog;
		},

		/** 
		 * Shows an Empty dialog to fill by its caller 
		 * @function
		 * @public 
		 * @static
		 * @param {sap.ui.core.mvc.Controller} oViewController the controller related to the parent view
		 * @param {string} sTitle the title of the dialog
		 * @param {function} fnCallbackBeginBtn call back function for left button
		 * @param {function} fnCallbackEndBtn call back function for right button
		 * @param {string} sBeginBtnText title of left button
		 * @param {string} sEndBtnText title of right button
		 * @returns {sap.m.Dialog} the dialog object
		 */
		showEmptyDialog: function (oViewController, sTitle, fnCallbackBeginBtn, fnCallbackEndBtn, sBeginBtnText, sEndBtnText) {
			var oDialog = new Dialog({
				title: sTitle,
				type: DialogType.Standard,
				state: sap.ui.core.ValueState.Information,
				afterClose: function () {
					oDialog.destroy();
				}
			});
			oDialog.setBeginButton(new Button({
				text: sBeginBtnText ? sBeginBtnText : oViewController.getResourceBundle().getText("base_CloseBtn"),
				width: "45%",
				press: function () {
					oDialog.close();
					if (typeof fnCallbackBeginBtn === "function") {
						fnCallbackBeginBtn();
					}
				},
				visible: false,
				type: ButtonType.Reject
			}));
			oDialog.getBeginButton().setVisible(false);
			if (sEndBtnText) {
				oDialog.setEndButton(new Button({
					text: sEndBtnText,
					width: "45%",
					press: function () {
						oDialog.close();
						if (typeof fnCallbackEndBtn === "function") {
							fnCallbackEndBtn();
						}
					},
					visible: false,
					type: ButtonType.Accept
				}));
				oDialog.getEndButton().setVisible(false);
			}
			return oDialog;
		}
	};
});