if (typeof (console) == "undefined") console = new function () { };
if (typeof (console.log) == "undefined") console.log = function () { };

if (typeof (ef) == "undefined")
	ef = new function () { };

ef.pageModel = null;
ef.pageUI = null;
ef.operations = {};
ef._serverPending = false;
ef._startTime = new Date();
ef.activeItem = null;
ef._eventChildren = ["expressions"];
ef.widgets = {};

EF_CLIENT_TYPE = {
	Browser: 1,
	OmniBrowser: 2,
	BrowserControl: 3
}

ef.clientType = EF_CLIENT_TYPE.Browser;
ef.clientProxy = {};

if (typeof (ef.profiling) == "undefined") {
	ef.profiling = new function () { };
	ef.profiling.enabled = false;
	ef.profiling.init = function () { };
	ef.profiling.beginEntry = function () { };
	ef.profiling.endEntry = function () { };
	ef.profiling.completeEntry = function () { };
}

ef.init = function () {

	try {
		ef.profiling.endEntry(ef.profiling.ENTRY_PAGE_LOAD); // Document load.
		ef.profiling.beginEntry(ef.profiling.ENTRY_PAGE_LOAD, "Page init");
		//console.log("ef.init: " + (new Date() - ef._startTime) + " ms");
		ef.$ui = $(document)
		ef.$document = $(document);
		ef.$window = $(window);
		if (typeof (ws) != "undefined" && typeof (ws.init) == "function")
			ws.init();
		ef.initCommon();

		var clientData = null;
		var $uiPageModel = $("[data-model='Page']");
		if ($uiPageModel.length) {
			clientData = $.parseJSON($uiPageModel.val());
			ef.pageModel = clientData.pageModel;

			ef.profiling.init(ef.pageModel ? ef.pageModel.profiling : null);

			ef.handleClientData(clientData.data);
			ef.handleClientDataUI(clientData.data);
		}

		if (ef.pageModel != null) {
			ef.bind();
		}

		ef.$window.resize(ef.onResize);
		ef.$window.scroll(ef.onScroll);
		ef.$window.keydown(ef.onKeyDown);
		ef.$window.keyup(ef.onKeyUp);
		ef.$window.keypress(ef.onKeyPress);
		ef.$document
			.on("click.ef", ef.onClick)
			.on("mousedown.ef", ef.onMouseDown)
			.on("mousemove.ef", ef.onMouseMove)
			.on("mouseup.ef", ef.onMouseUp)
			.on("mouseover.ef", ef.onMouseOver)
			.on("mouseout.ef", ef.onMouseOut)
			.on("contextmenu.ef", ef.onContextMenu)
			.on("paste.ef", ef.onPaste);

		if (typeof (document.addEventListener) == "function") {
			document.addEventListener("scroll", ef.onDocumentScroll, true);
		}

		ef.device();

		ef.updateSession();

		if (typeof (ws) != "undefined" && typeof (ws.bind) == "function")
			ws.bind();


		if (typeof (ide) != "undefined" && typeof (ide.init) == "function") {
			ide.init();
		}

		//if (typeof(ef.design) != "undefined" && typeof(ef.design.init) == "function") {
		//	ef.design.init();
		//}

		if (ef._scroll) {
			var scroll = parseInt(ef._scroll);
			ef._scroll = null;
			if (!isNaN(scroll)) {
				var $uiContainer = ef.$ui.find(".form-content-pane:first");
				if ($uiContainer.length == 0) {
					$uiContainer = ef.$document;
				}
				$uiContainer.scrollTop(scroll);
			}
		}

		if (ef._focusTarget) {
			var itemUI = ef.findItemUI(ef._focusTarget);
			if (itemUI != null) {
				ef.focus(itemUI.$ui);
			}
		}

		if (ef.inIframe()) {
			ef.initInIframe();
		}

		if (typeof (ef.realtime) != "undefined" && typeof (ef.realtime.init) == "function")
			ef.realtime.init();

		ef.profiling.endEntry(ef.profiling.ENTRY_PAGE_LOAD); // Page init.
		ef.profiling.completeEntry(ef.profiling.ENTRY_PAGE_LOAD);
		if (ef.profiling.enabled)
			setTimeout(function () { ef.profiling.utils.collectResources(); ef.profiling.utils.testSpeed(); }, 5000);
	} catch (ex) {
		throw ex;
	} finally {
		$(".workspace-loading").remove();
		$(".workspace").addClass("ready");
	}
}

$(ef.init);

ef.initCommon = function (uiContainer) {

	var startTime = new Date();

	uiContainer = uiContainer ? uiContainer : document;
	var $uiContainer = $(uiContainer);

	$uiContainer.find("[data-cmd]").addBack("[data-cmd]").each(function (index, uiCmd) {
		if ($.data(uiCmd, "data_cmd")) return;
		$.data(uiCmd, "data_cmd", true);

		if (uiCmd.tagName == "A" && uiCmd.href == "")
			uiCmd.href = "#";

		var $uiCmd = $(uiCmd);

		$uiCmd.off("click.ef").on("click.ef", ef.cmdClick);
	});

	$uiContainer.find("[data-dblclick]").addBack("[data-dblclick]").each(function (index, uiCmd) {
		if ($.data(uiCmd, "data_dblclick")) return;
		$.data(uiCmd, "data_dblclick", true);

		if (uiCmd.tagName == "A" && uiCmd.href == "")
			uiCmd.href = "#";

		var $uiCmd = $(uiCmd);

		$uiCmd.dblclick(ef.dblClick);

	});

	$uiContainer.find("[data-default-cmd]").addBack("[data-default-cmd]").each(function (groupIndex, groupElement) {

		$("input", groupElement).each(function (inputIndex, inputElement) {
			$(inputElement)
				.off("keypress.defaultCmd")
				.on("keypress.defaultCmd", function (eventData) {
					if (eventData.which == 13) {
						var $uiCmd = $uiContainer.find("[data-cmd='" + $(groupElement).attr("data-default-cmd") + "']");
						if ($uiCmd.length == 0)
							$uiCmd = $uiContainer.find("[data-cmd][data-name='" + $(groupElement).attr("data-default-cmd") + "']");
						setTimeout(function () { $uiCmd.click(); }, 100);
						eventData.preventDefault();
						return false;
					}
				});
		});
	});

	$uiContainer.find("[data-tooltip]").addBack("[data-tooltip]")
		.off("mouseenter.tooltipInit").on("mouseenter.tooltipInit", function () {
			var $uiElement = $(this);
			var $uiTooltipTarget = $uiElement.find("[data-tooltip-target]");
			if ($uiTooltipTarget.length === 0) {
				$uiTooltipTarget = $uiElement;
			}
			var $uiTooltipContent = $uiElement.find("[data-tooltip-content]");
			if ($uiTooltipContent.length === 0) {
				$uiTooltipContent = $uiElement.find(".hidden-tooltip");
			}
			var tooltip = {
				html: $uiTooltipContent.html()
			}
			var options = {
				timeout: 100
			};
			if ($uiTooltipContent.attr("data-tooltip-head") != null) {
				options.head = { text: $uiTooltipContent.attr("data-tooltip-head") };
			}
			if ($uiTooltipContent.attr("data-tooltip-class") != null) {
				options.cssClass = $uiTooltipContent.attr("data-tooltip-class");
			}
			if ($uiTooltipContent.attr("data-tooltip-content-interactive") != null) {
				options.isInteractive = true;
			}
			ef.tooltip.show($uiTooltipTarget[0], tooltip, options);
		})
		.off("mouseleave.tooltipInit").on("mouseleave.tooltipInit", function () {
			if (!ef.tooltip.getVisible()) {
				ef.tooltip.cancelShow();
			}
		});

	$uiContainer.find(".hidden-tooltip").each(function (index, uiTooltipContent) {
		var $uiElement = $(uiTooltipContent).parent();
		$uiElement.off("mouseenter.tooltipInit").on("mouseenter.tooltipInit", function () {
			var $uiTooltipTarget = $(this);
			var $uiTooltipContent = $(uiTooltipContent);
			var tooltip = {
				html: $uiTooltipContent.html()
			}
			var options = {
				timeout: 100
			};
			var tooltipClass = ef.findClass("tooltip-class-", uiTooltipContent);
			if (tooltipClass)
				options.cssClass = tooltipClass.substring("tooltip-class-".length);
			options.isInteractive = true;
			ef.tooltip.show($uiTooltipTarget[0], tooltip, options);
		})
			.off("mouseleave.tooltipInit").on("mouseleave.tooltipInit", function () {
				if (!ef.tooltip.getVisible()) {
					ef.tooltip.cancelShow();
				}
			});
	});

	$uiContainer.find("[data-cmd][data-auto]").each(function (index, uiCmd) {
		if ($.data(uiCmd, "data_cmd_auto")) return;
		$.data(uiCmd, "data_cmd_auto", true);

		var timer = parseInt(uiCmd.getAttribute("data-timer")) * 1000;

		setTimeout(function () {
			if ($.contains(document.documentElement, uiCmd))
				ef.cmdClick.call(uiCmd);
		}, timer);
	});

	$uiContainer.find("[data-mask]").addBack("[data-mask]").each(function (index, element) {
		if ($.data(element, "data_mask")) return;
		$.data(element, "data_mask", true);
		var $element = $(element);
		var mask = $element.attr("data-mask");
		$element.mask(mask, {
			placeholder: mask.replace(/\w/g, "_")
		});
	});

	var endTime = new Date();

	//console.log("ef.initCommon: " + (endTime - startTime) + " ms");

	if (typeof (ef.forms) != "undefined" && typeof (ef.forms.initCommon) == "function")
		ef.forms.initCommon($uiContainer);

	if (typeof (gs) != "undefined" && typeof (gs.initCommon) == "function")
		gs.initCommon(uiContainer);

	if (typeof (ws) != "undefined" && typeof (ws.initCommon) == "function")
		ws.initCommon(uiContainer);
}

ef.bind = function () {

	var startTime = new Date();

	ef.pageUI = {
		contexts: {}
	};

	for (var contextID in ef.pageModel.contexts) {

		ef.bindContext(contextID);
	}

	var endTime = new Date();

	//console.log("bind: " + (endTime - startTime) + " ms");
}

ef.bindContext = function (contextID) {

	var contextUI = new ModelItemUI({
		contextID: contextID,
		context: ef.pageModel.contexts[contextID],
		item: ef.pageModel.contexts[contextID],
		items: []
	});

	/*var contextUI = {
		contextID: contextID,
		context: ef.pageModel.contexts[contextID],
		$ui: ef.$ui.find("[data-context='" + contextID + "']"),
		items: []
	};*/

	ef.pageUI.contexts[contextID] = contextUI;

	ef.bindLevel(contextUI, contextUI, contextUI.context);

	if (typeof (sf) != "undefined" && typeof (sf.comments) != "undefined" && typeof (sf.comments.buildContextComments) == "function") {
		sf.comments.buildContextComments(contextUI);
	}
}

ef.bindLevel = function (contextUI, parentItemUI, parentItem) {

	if (parentItem.items == null || parentItem.items.length == 0)
		return;

	for (var itemIndex = 0; itemIndex < parentItem.items.length; itemIndex++) {

		var item = parentItem.items[itemIndex];

		var itemUI = new ModelItemUI({
			contextUI: contextUI,
			item: item,
			parent: parentItemUI
		});

		parentItemUI.items.push(itemUI);

		if (item.items && item.items.length != 0) {
			itemUI.items = [];
			ef.bindLevel(contextUI, itemUI, item);
		}
	}
}

ef.parseValue = function (field, $uiField) {

	var value = null;

	if (field.view == "Check") {
		value = $uiField.check("getValue") ? "1" : "0";
	} else if (field.view == "DateTime" || field.view == "DateTimeOffset") {
		var $uiDate = $uiField.find("[data-part='date']");
		var date = ef.parseDate($uiDate.val());
		if (date != null) {
			var $uiTime = $uiField.find("[data-part='time']");
			var time = null;
			if ($uiTime.length != 0) {
				time = ef.parseTime($uiTime.val());
			}
			value = $.datepicker.formatDate("yy'-'mm'-'dd", date)
				+ "T" + (time != null ? $.datepicker.formatTime("HH:mm:ss.0000000", { hour: time.getHours(), minute: time.getMinutes() }) : "00:00:00.0000000");
			value += $uiField.find("[data-part='offset']").val() || "Z";
		}
		else
			value = null;
	} else if (field.view == "Date") {
		var $uiDate = $uiField.find("[data-part='date']");
		var date = ef.parseDate($uiDate.val());
		if (date != null) {
			value = $.datepicker.formatDate("yy'-'mm'-'dd'T00:00:00.0000000'", date);
			value += $uiField.find("[data-part='offset']").val() || "Z";
		} else
			value = null;
	} else if (field.view == "Time") {
		var $uiTime = $uiField.find("[data-part='time']");
		var time = ef.parseTime($uiTime.val());
		if (time != null) {
			value = $.datepicker.formatTime("'2000-01-01T'HH:mm:ss.0000000", { hour: time.getHours(), minute: time.getMinutes() });
			value += $uiField.find("[data-part='offset']").val() || "Z";
		} else
			value = null;
	} else if (field.view == "SingleChoiceList") {
		var $uiValue = $uiField.find("[data-value].checked");
		if ($uiValue.length != 0) {
			value = $uiValue.attr("data-value");
		} else {
			if (field.dataType == "Text")
				value = "";
			else
				value = "0";
		}
	} else if (field.view == "MultiChoice") {
		var $uiValue = $uiField.find("[data-value].checked");
		if (field.dataType == "Binary") {
			var bytes = [];
			for (var i = 0; i < $uiValue.length; i++) {
				var ind = parseInt($uiValue[i].getAttribute("data-value"));
				if (ind == 0) continue;
				var shift = ind - 1;
				var ibyte = 15 - Math.floor(shift / 8);
				var ibit = shift % 8;
				bytes[ibyte] |= 1 << ibit;
			}
			value = "0x";
			for (var i = 0; i < 16; i++) {
				var b = bytes[i];
				var h = b == null ? "00" : b.toString(16);
				if (h.length == 1) h = "0" + h;
				value += h;
			}
		} else {
			var options = [];
			for (var i = 0; i < $uiValue.length; i++) {
				var optionValue = $uiValue[i].getAttribute("data-value");
				if (optionValue != "") {
					options.push(optionValue);
				}
			}
			value = options.join(",");
		}
	} else {
		var $uiInput;
		if ($uiField[0].tagName === "INPUT" || $uiField[0].tagName === "TEXTAREA")
			$uiInput = $uiField;
		else {
			var result = $uiField.find("input, textarea");
			if (result.length !== 0)
				$uiInput = result;
			else
				$uiInput = $uiField;
		}
		if ($uiInput.attr("data-mask") != null) {
			value = $uiInput.cleanVal()
		} else {
			value = $uiInput.val();
		}
		value = $.trim(value);
		switch (field.dataType) {
			case "Int": case "Long": case "Decimal": case "Double":
				if (value == "") {
					value = null;
				} else {
					var number = ef.parseFloat(value);
					value = number == null ? null : number + "";
				}
		}
	}

	return value;
}

ef.parseFieldValue = function (serializedValue, field) {
	var value = null;
	if (serializedValue == null)
		value = null;
	else {
		switch (field.dataType) {
			case "Text":
				value = serializedValue;
				break;
			case "Int": case "Long": case "Decimal": case "Double":
				if (serializedValue == null)
					value = null;
				else
					value = ef.parseFloat(serializedValue);
				break;
			case "Date": case "DateTime":
				value = new Date(Date.parse(serializedValue));
				break;
			case "Boolean":
				value = serializedValue === "true";
				break;
			default:
				throw "Failed to parse field value '" + serializedValue + "'.";
		}
	}
	return value;
}

ef.tryNormalizeNumberInput = function (s) {
	s = $.trim(s);
	if (ef.pageModel.lang == "en") {
		s = s.replace(/[\s,]/g, "");
	} else {
		s = s.replace(/\s/g, "").replace(",", ".");
	}
	return s;
}

ef.isNumberString = function (s) {
	return /^(\+|\-)?[\d]+(\.[\d]+)?$/.test(s)
}

ef.parseFloat = function (s) {
	var value = null;
	s = ef.tryNormalizeNumberInput(s);
	if (ef.isNumberString(s)) {
		value = parseFloat(s);
		if (isNaN(value)) {
			value = null;
		}
	}
	return value;
}

ef.parseDate = function (s) {
	var value = null;
	if (s.length != 0) {
		var dayText = null;
		var monthText = null;
		var yearText = null;
		if (ef.pageModel.lang == "en") {
			var match = /^(\d{1,2})[\/](\d{1,2})[\/]((\d{2})|(\d{4}))$/.exec(s)
				|| /^(\d{2})(\d{2})((\d{2})|(\d{4}))$/.exec(s);
			if (match != null) {
				dayText = match[2];
				monthText = match[1];
				yearText = match[3];
			}
		} else {
			var match = /^(\d{1,2})[\.](\d{1,2})[\.]((\d{2})|(\d{4}))$/.exec(s)
				|| /^(\d{2})(\d{2})((\d{2})|(\d{4}))$/.exec(s);
			if (match != null) {
				dayText = match[1];
				monthText = match[2];
				yearText = match[3];
			}
		}
		if (dayText != null) {
			var day = parseInt(dayText);
			var month = parseInt(monthText);
			var year = parseInt(yearText);
			if (year < 100) {
				year = 2000 + year;
			}
			if (ef.isValidDate(year, month, day)) {
				value = new Date(year, month - 1, day);
			}
		}
	}
	return value;
}

ef.parseTime = function (s) {
	var value = null;
	if (s.length != 0) {
		var hoursText = null;
		var minutesText = null;
		var match = /^(\d{1,2})[\:](\d{1,2})$/.exec(s);
		if (match != null) {
			hoursText = match[1];
			minutesText = match[2];
		}
		if (hoursText != null) {
			var hours = parseInt(hoursText);
			var minutes = parseInt(minutesText);
			if (ef.isValidTime(hours, minutes)) {
				value = new Date(0, 0, 1, hours, minutes);
			}
		}
	}
	return value;
}

ef.isValidDate = function (year, month, day) {
	var isValid = false;
	try {
		if (year > 0 && year < 9999 && month >= 1 && month <= 12 && day >= 1 && day <= 31) {
			var date = new Date(year, month - 1, day);
			if (date.getTime() === date.getTime()
				&& date.getFullYear() === year
				&& date.getMonth() === month - 1
				&& date.getDate() === day) {
				isValid = true;
			}
		}
	} catch (ex) {
	}
	return isValid;
}

ef.isValidTime = function (hours, minutes) {
	var isValid = false;
	try {
		if (hours >= 0 && hours <= 23 && minutes >= 0 && minutes <= 59) {
			isValid = true;
		}
	} catch (ex) {
	}
	return isValid;
}

ef.op = function (op, options) {

	if (op.type == "fieldChanged") {

		var field = op.ui.itemUI.item;

		if (typeof (op.value) != "undefined") {
			ef.regFieldUpdate(field.path, op.value, op.displayValue);
			//ef.setBoundValue(op.ui.bindingPath, op.value);
		}

		var autoUpdate = (options && options.autoUpdate)
			|| (op.ui.itemUI.parent.parent && op.ui.itemUI.parent.parent.item && op.ui.itemUI.parent.parent.item.type == "grid" && op.ui.itemUI.parent.parent.item.autoUpdate);

		if (field.isMarkChanged && !autoUpdate) {
			var contextID = field.path.split(":")[0];
			var context = ef.pageModel.contexts[contextID];
			if (typeof (context.changedFields) == "undefined")
				context.changedFields = [];
			if (context.changedFields.indexOf(field.path) == -1)
				context.changedFields.push(field.path.split(":")[1]);

			ef.activateOnChanges(contextID);
			ef.markContextChanged(contextID);
		}

		ef.validation.fieldChanged(field.path);

		if (autoUpdate) {
			ef.cmd("_autoUpdate");
		}
	}
}

ef.regFieldUpdate = function (path, value, displayValue) {

	var contextID = ef.parseContextID(path);
	var context = ef.pageModel.contexts[contextID];
	var update = null;
	if (!context.updates) {
		context.updates = [];
	}
	if (context.updates.length !== 0 && context.updates[context.updates.length - 1].status === "collecting") {
		update = context.updates[context.updates.length - 1];
	}
	if (update === null) {
		update = {
			stamp: ef.getStamp(),
			status: "collecting",
			data: []
		};
		context.updates.push(update);
	}
	var item = ef.findElement(update.data, "path", path);
	if (item === null) {
		item = {};
		update.data.push(item);
	}
	item.path = path;
	item.value = value;
	if (typeof (displayValue) != "undefined") {
		item.displayValue = displayValue;
	} else {
		delete item.displayValue;
	}
}

ef.getStamp = function () {

	ef._opindex = typeof (ef._opindex) == "undefined" ? 1 : ef._opindex + 1;

	var stamp = new Date().getTime() + ("0000000000" + ef._opindex).slice(-10);

	return stamp;
}

ef._lastCmdClick = null;

ef.cmdClick = function () {
	if (ef._lastCmdClick != null && (new Date() - ef._lastCmdClick) < 300) {
		return;
	}
	ef._lastCmdClick = new Date();

	var uiCmd = this;
	var cmd = uiCmd.getAttribute("data-cmd");

	ef.updateSession();

	var path = ef.getPath(uiCmd);
	if (ef.isDesignMode(path) && !uiCmd.getAttribute("data-design")) {
		return;
	}

	if (uiCmd.getAttribute("data-disabled") != null) {
		return false;
	}

	if (uiCmd.getAttribute("data-confirm") != null) {
		var msg = uiCmd.getAttribute("data-confirm");
		if (!window.confirm(msg))
			return false;
	}

	if (cmd.indexOf("c:") == 0) { // Client cmd.
		cmd = $.trim(cmd.substring(2));
		if (cmd.indexOf("{") == 0) {
			var data = $.parseJSON(cmd);
			ef.clientCmd(this, data);
		} else {
			try {
				$.globalEval(cmd)
			} catch (e) {
				console.log("cmd failed. " + e);
			}
		}
		return false;
	};

	ef.cmd(cmd, uiCmd);

	return false;
}

ef._cmdStack = [];
ef._backgroundCmdQueue = [];

ef.cmd = function (cmd, uiCmd, options) {
	if (options && options.unsavedChangesRequest) {
		if (ef.isUnsavedChanges()) {
			ef._cmdStack.push({
				cmd: cmd,
				uiCmd: uiCmd,
				options: options
			});
			ef.unsavedChangesRequest();
			return;
		}
	}

	var data = {
		cmd: cmd,
		stamp: ef.getStamp()
	}

	if (options && options.model !== undefined && !options.model)
		data.pageModel = "null";
	else
		data.pageModel = JSON.stringify(ef.pageModel, null, 0)

	if (ef.clientType === EF_CLIENT_TYPE.BrowserControl) {
		if (ef.clientProxy.clientData) {
			data.clientProxy = ef.clientProxy.clientData;
		}
	}

	if (uiCmd) {
		var $uiCmd = $(uiCmd);

		var formData = null;

		var $uiForm = $uiCmd.parents("[data-form]:first");

		if ($uiForm.length != 0)
			formData = $uiForm.serializeObject();

		data.formData = formData ? JSON.stringify(formData, null, 0) : null;

		if ($uiCmd.attr("data-tag") != null) {
			data.tag = $uiCmd.attr("data-tag");
		}

		if ($uiCmd.attr("data-ide") != null) {
			data.ide = $uiCmd.attr("data-ide");
		}
	}

	if (options && options.path)
		data.path = options.path;
	else if (uiCmd)
		data.path = ef.getPath(uiCmd);

	if (options && options.saveChanges)
		data.saveChanges = true;

	if (options && options.data)
		data = $.extend(data, options.data);

	ef.activeItem = data.path;

	var url = location.href;

	if (!options || options.lock === undefined || options.lock) {
		ef.loading.show();
		ef._serverPending = true;
		$("body").addClass("server-pending");
	} else {
		// Background cmd.
		data.isBackground = true;
	}

	ef.device();

	if (data.isBackground) {
		ef._backgroundCmdQueue.push({
			cmd: cmd,
			uiCmd: uiCmd,
			options: options,
			data: data
		});
		ef.executeBackgroundCmd();
	} else {
		ef.profiling.beginEntry("CMD_" + data.stamp, "Request sending / Response downloading");
		$.ajax({
			url: url,
			type: "POST",
			dataType: "json",
			cache: false,
			data: data,
			success: function (response) {
				ef._serverPending = false;
				$("body").removeClass("server-pending");
				ef.loading.hide();
				ef.handleResponse(response);
			},
			error: function (jqXHR, textStatus, errorThrown) {
				ef._serverPending = false;
				$("body").removeClass("server-pending");
				ef.loading.hide();
				ef.handleFailedResponse();
				if (jqXHR.responseJSON && jqXHR.responseJSON.data) {
					ef.handleResponse(jqXHR.responseJSON);
				}
			}
		});
	}

	return false;
}

ef._backgroundCmdServerPending = false;

ef.executeBackgroundCmd = function () {
	if (ef._backgroundCmdQueue.length === 0)
		return;

	if (ef._backgroundCmdServerPending)
		return;

	ef._backgroundCmdServerPending = true;

	var cmdState = ef._backgroundCmdQueue.shift();

	ef.profiling.beginEntry("CMD_" + cmdState.data.stamp, "Request");

	$.ajax({
		url: location.href,
		type: "POST",
		dataType: "json",
		cache: false,
		data: cmdState.data,
		success: function (response) {
			ef._backgroundCmdServerPending = false;
			ef.handleResponse(response);
			if (ef._backgroundCmdQueue.length !== 0)
				setTimeout(ef.executeBackgroundCmd, 1);
		},
		error: function (jqXHR, textStatus, errorThrown) {
			ef._backgroundCmdServerPending = false;
			if (jqXHR.responseJSON && jqXHR.responseJSON.data) {
				ef.handleResponse(jqXHR.responseJSON);
			}
			if (ef._backgroundCmdQueue.length !== 0)
				setTimeout(ef.executeBackgroundCmd, 1);
		}
	});
}

ef.findIndex = function (array, name, value) {

	var index = -1;

	for (var i = 0; i < array.length; i++)
		if (array[i] != null && array[i][name] == value) {
			index = i;
			break;
		}

	return index;
}

ef.findElement = function (array, name, value) {

	var index = ef.findIndex(array, name, value);

	return index != -1 ? array[index] : null;
}

ef.getPath = function (el) {

	if ($.data(el, "path"))
		return $.data(el, "path");

	if (el.getAttribute("data-path") != null)
		return el.getAttribute("data-path");

	if (el.getAttribute("data-ui-path") != null)
		return el.getAttribute("data-ui-path");

	var $uiParent = $(el).parents("[data-path]:first");

	if ($uiParent.length != 0)
		return $uiParent[0].getAttribute("data-path");
	else
		return ""; // "Cannot retrieve path for element " + el.outerHTML.substring(0, 200);	
}

ef.isDesignMode = function (path) {
	return false;
	if (!path) {
		return false;
	}
	var parts = path.split(":");
	var contextID = parts[0];
	var context = ef.pageModel.contexts[contextID];
	return context.isDesign;
}

ef.handleResponse = function (response) {
	if (response.stamp) {
		ef.profiling.endEntry("CMD_" + response.stamp);
		ef.profiling.beginEntry("CMD_" + response.stamp, "Response processing");
	}

	if (response.pageModel) {
		ef.updatePageModel(response.pageModel);
	}

	ef.handleClientData(response.data);

	if (response.pageModel) {
		ef.updatePageUI(response.pageModel);
	}

	ef.handleClientDataUI(response.data);

	if (response.pageModel) {
		ef.validation.apply();
		ef.applyChangedFields();
	}

	//if (typeof(ef.design) != "undefined" && typeof(ef.design.handleResponse) == "function")
	//	ef.design.handleResponse(response);

	if (typeof (ef.forms) != "undefined" && typeof (ef.forms.handleResponse) == "function")
		ef.forms.handleResponse(response);

	if (typeof (sf) != "undefined" && typeof (sf.comments) != "undefined" && typeof (sf.comments.handleResponse) == "function") {
		sf.comments.handleResponse(response);
	}

	if (typeof (gs) != "undefined" && typeof (gs.handleResponse) == "function")
		gs.handleResponse(response);

	if (response.stamp) {
		ef.profiling.endEntry("CMD_" + response.stamp);
		ef.profiling.completeEntry("CMD_" + response.stamp);
	}
}

ef.handleClientData = function (data) {

	for (var i = 0; i < data.length; i++) {

		var item = data[i];

		if (item == null) continue;

		if (item.type == "view") {

			var target = item.target;

			var $uiContainer = null;

			if (target == "" && item.context) {
				var contextUI = ef.pageUI.contexts[item.context];

				if (contextUI == null)
					throw "Target context UI \"" + target + "\" was not found.";

				contextUI.replaceView(item.view);

				$uiContainer = contextUI.$ui;

				var $uiPopup = $uiContainer.parents("[data-control='popup']:first");
				if ($uiPopup.length != 0) {
					var popup = $uiPopup.data("popup");
					ef.setPopupContent(popup);
				} else {
					if (typeof (ws) != "undefined" && typeof (ws.init) == "function")
						ws.init();
				}

			} else if (target == "Popup") {
				ef.menu.hide();
				ef.closeLookups();
				var popup = ef.popup({
					view: item.view,
					width: item.width,
					height: item.height,
					onClose: item.onClose,
					originator: item.originatorPath
				});
				$uiContainer = popup.$uiPopup;
				if (item.context)
					popup.context = item.context;
			} else if (target == "ExpressPopup") {
				ef.menu.hide();
				ef.closeLookups();
				var popup = ef.popup({
					view: item.view,
					width: item.width,
					height: item.height,
					onClose: item.onClose,
					cssClass: "express-popup",
					attachTo: item.attachPath,
					originator: item.originatorPath
				});
				$uiContainer = popup.$uiPopup;
				if (item.context)
					popup.context = item.context;
			} else if (target.indexOf("Group:") == 0) {
				var id = target.substring("Group:".length);
				$uiContainer = $("[data-group='" + id + "']");

				if ($uiContainer.length == 0)
					throw "Target element \"" + target + "\" was not found.";

				$uiContainer.html(item.view);
			} else if (target.indexOf("_") == 0) {
				if (target == "_Notifications:Bar") {
					$uiContainer = ef.$ui.find(".notifications-bar");
					$uiContainer.replaceWith(item.view);
					$uiContainer = ef.$ui.find(".notifications-bar");
				}
			} else {
				var itemUI = ef.findItemUI(target);

				if (itemUI == null)
					throw "Target item UI \"" + target + "\" was not found.";

				itemUI.replaceView(item.view);

				$uiContainer = itemUI.$ui;
			}

			ef.initCommon($uiContainer[0]);
		} else if (item.type == "message") {

			if (item.view == "inline") {
				var itemUI = ef.findItemUI(item.target);
				ef.message.showInline(item.message, itemUI);
			} else if (item.view == "hide") {
				var itemUI = ef.findItemUI(item.target);
				ef.message.hideInline(itemUI);
			} else {
				ef.message.show(item.message, item);
			}

		} else if (item.type === "sound") {

			ef.sound(item);

		} else if (item.type == "focus") {

			ef._focusTarget = item.target;

		} else if (item.type == "scroll") {

			ef._scroll = item.scroll;

		} else if (item.type == "redirect") {

			if (item.back)
				ef.setCookie("back", "1");

			if (item.target) {
				window.open(item.url, item.target);
			} else {
				ef.loading.show();
				location.href = item.url;
			}
		} else if (item.type == "download") {

			ef.download(item.url);

		} else if (item.type == "print") {

			ef.printer.print(item.url, item);

		} else if (item.type == "close") {

			if (ef.popups.length != 0) {
				var popup = ef.popups[ef.popups.length - 1];
				ef.closePopup(popup.$uiPopup[0], { force: true });
			}
		} else if (item.type == "displayName") {

			var target = item.target;
			var itemUI = ef.findItemUI(target);

			if (itemUI != null)
				itemUI.applyDisplayName(item);

		} else if (item.type == "ide") {

			ide.cmd(item.op);

		} else if (item.type == "design") {

			ef.design.cmd(item.op);

		} else if (item.type == "dev") {

			ef.dump(item.dump, "Dump");

		} else if (item.type == "error") {

			if (item.dump)
				ef.dump(item.dump, { title: ef.resource("Error.Text") });
			else
				ef.message.show(item.message, { title: ef.resource("Error.Text"), width: 350 });

		} else if (item.type == "submitForm") {

			var $uiForm = $(item.form);
			$("body").append($uiForm);
			$uiForm.submit();
		} else if (item.type == "field" || item.type == "grid" || item.type == "itemUI") {
			var target = item.target;
			var itemUI = ef.findItemUI(target);
			if (itemUI != null)
				itemUI.cmd(null, item.data);
		} else if (item.type == "WebTerminal") {
			webTerminal.cmd(item);
		} else if (item.type == "Client") {
			ef.clientProxy.cmd(item);
		} else if (item.type === "tooltip") {
			ef.tooltip.content(item.context);
		} else if (item.type) {
			ef.forward(ef, ef._eventChildren, "cmd", item);
		}
	}
}

ef.handleClientDataUI = function (data) {
	for (var i = 0; i < data.length; i++) {
		var item = data[i];
		if (item == null) continue;

		if (item.type == "markers") {
			var target = item.target;
			var itemUI = ef.findItemUI(target);
			if (itemUI != null)
				itemUI.applyMarkers(item);
		} else if (item.type == "widget") {

			var target = item.target;
			var itemUI = ef.findItemUI(target);

			if (itemUI != null)
				itemUI.widget(item.widget);
		} else if (item.type == "Workspace") {
			if (typeof (ws) !== "undefined" && typeof (ws.cmd) === "function")
				ws.cmd(item.op)
		}
	}
}

ef.handleFailedResponse = function () {

	/*for(var i = 0; i < ef.updates.length; i++) {
		var update = ef.updates[i];
		if (update.status == "updating") {
			for (var bindingPath in update.data) {
				var item = update.data[bindingPath];
				ef.markField(item.field, "failed");
			}
		}
	}*/
}

ef.updatePageModel = function (pageModelUpdate) {

	ef.pageModel.private = pageModelUpdate.private;

	ef.pageModel.realtime = pageModelUpdate.realtime;
	if (ef.pageModel.realtime && ef.pageModel.realtime.enabled && typeof (ef.realtime) != "undefined" && typeof (ef.realtime.init) == "function")
		ef.realtime.init();


	for (var contextID in pageModelUpdate.contexts) {

		var context = ef.pageModel.contexts[contextID];
		var contextUpdate = pageModelUpdate.contexts[contextID];

		if (!context || context.gid != contextUpdate.gid) {
			ef.pageModel.contexts[contextID] = contextUpdate;
		} else {
			context.data = contextUpdate.data;
			context.private = contextUpdate.private;
			delete context.updates;
			if (contextUpdate.validationStamp) {
				context.newValidationStamp = contextUpdate.validationStamp;
				context.isValidationPopup = contextUpdate.isValidationPopup;
				context.isValid = contextUpdate.isValid;
				context.validations = contextUpdate.validations;
			}
			context.activatedSteps = contextUpdate.activatedSteps;
			context.changedFields = contextUpdate.changedFields;
			context.unsavedChanges = contextUpdate.unsavedChanges;
			context.comments = contextUpdate.comments;
			context.design = contextUpdate.design;
			ef.updateModelLevel(context, context, contextUpdate);
		}
	}
}

ef.updateModelLevel = function (context, parentItem, parentItemUpdate) {

	if (parentItemUpdate.items == null || parentItemUpdate.items.length == 0)
		return;

	for (var itemIndex = 0; itemIndex < parentItemUpdate.items.length; itemIndex++) {

		var itemUpdate = parentItemUpdate.items[itemIndex];
		var item = parentItem.items[itemIndex];

		if (itemUpdate.html != null) {
			parentItem.items[itemIndex] = itemUpdate;
			item = parentItem.items[itemIndex];
		} else if (itemUpdate.type != item.type) {
			parentItem.items[itemIndex] = itemUpdate;
			item = parentItem.items[itemIndex];
		} else if (itemUpdate.type == "grid") {
			parentItem.items[itemIndex] = itemUpdate;
			item = parentItem.items[itemIndex];
		} else if (itemUpdate.type == "tabs") {
			parentItem.items[itemIndex] = itemUpdate;
			item = parentItem.items[itemIndex];
		} else {
			var props = ["active", "displayName", "icon", "disabled"]
			for (var propIndex = 0; propIndex < props.length; propIndex++) {
				var prop = props[propIndex];
				if (typeof (itemUpdate[prop]) != "undefined")
					item[prop] = itemUpdate[prop];
			}
			if (itemUpdate.changed) {
				item.changed = itemUpdate.changed;
			}
			if (itemUpdate.updated) {
				item.updated = itemUpdate.updated;
			}
			if (itemUpdate.widget) {
				item.widget = itemUpdate.widget;
			}
			if (itemUpdate.type == "button") {
				if (itemUpdate.menu)
					item.menu = itemUpdate.menu;
				item.hidden = itemUpdate.hidden;
			}
			if (typeof (itemUpdate.private) !== "undefined") {
				item.private = itemUpdate.private;
			}
		}

		if (itemUpdate.items && itemUpdate.items.length != 0) {
			ef.updateModelLevel(context, parentItem.items[itemIndex], itemUpdate);
		}
	}
}

ef.updatePageUI = function (pageModelUpdate) {

	for (var contextID in pageModelUpdate.contexts) {

		var context = ef.pageModel.contexts[contextID];
		var contextUpdate = pageModelUpdate.contexts[contextID];

		if (context == null)
			continue;

		var contextUI = ef.pageUI.contexts[contextID];

		if (!contextUI || contextUI.context.gid != contextUpdate.gid) {
			ef.bindContext(contextID);
		} else {
			ef.updateUILevel(context, context, contextUpdate);
			if (typeof (sf) != "undefined" && typeof (sf.comments) != "undefined" && typeof (sf.comments.buildContextComments) == "function") {
				sf.comments.buildContextComments(contextUI);
			}
		}
	}

	if (ef._scroll) {
		var scroll = parseInt(ef._scroll);
		ef._scroll = null;
		if (!isNaN(scroll)) {
			var $uiContainer = ef.$ui.find(".form-content-pane:first");
			if ($uiContainer.length == 0) {
				$uiContainer = ef.$document;
			}
			$uiContainer.scrollTop(scroll);
		}
	}

	if (ef._focusTarget) {
		var itemUI = ef.findItemUI(ef._focusTarget);
		if (itemUI != null) {
			ef.focus(itemUI.$ui);
		}
		ef._focusTarget = null;
	}
}

ef.updateUILevel = function (context, parentItem, parentItemUpdate) {

	if (parentItemUpdate.items == null || parentItemUpdate.items.length == 0)
		return;

	for (var itemIndex = 0; itemIndex < parentItemUpdate.items.length; itemIndex++) {

		var itemUpdate = parentItemUpdate.items[itemIndex];
		var item = parentItem.items[itemIndex];
		var itemUI = ef.findItemUI(item.path);
		if (itemUI == null) {
			continue;
		}

		if (itemUpdate.html != null)
			itemUI.replaceView(itemUpdate.html);

		if (itemUpdate.html != null || (typeof (itemUI.stamp) != "undefined" && itemUI.stamp != itemUpdate.stamp) || itemUI.$ui.length == 0 || !$.contains(document.documentElement, itemUI.$ui[0])) {

			var parentItemUI = itemUI.parent;

			itemUI = new ModelItemUI({
				contextUI: itemUI.contextUI,
				item: item,
				parent: parentItemUI
			});

			parentItemUI.items[itemIndex] = itemUI;

			if (item.items && item.items.length != 0) {
				itemUI.items = [];
				ef.bindLevel(itemUI.contextUI, itemUI, item);
			}
		} else {
			itemUI.applyModel(item);

			/*if (itemUpdate.type == "grid" && itemUpdate.stamp != item.stamp) {
				if (itemUI.items)
					itemUI.items.length = 0;
				else
					itemUI.items = [];
				ef.bindLevel(itemUI.contextUI, itemUI, item);
			} else if (itemUpdate.type == "tabs") {
				if (itemUI.items)
					itemUI.items.length = 0;
				else
					itemUI.items = [];
				ef.bindLevel(itemUI.contextUI, itemUI, item);
			}*/

			if (itemUpdate.items && itemUpdate.items.length != 0) {
				ef.updateUILevel(context, parentItem.items[itemIndex], itemUpdate);
			}
		}

		if (itemUpdate.html != null) {
			var $uiContainer = itemUI.getContainer();
			if ($uiContainer.length !== 0)
				ef.initCommon($uiContainer[0]);
		}
	}
}

ef.validation = new function () { };

ef.validation.apply = function () {

	for (var contextID in ef.pageModel.contexts) {

		var context = ef.pageModel.contexts[contextID];
		var contextUI = ef.pageUI.contexts[contextID];
		var isValidationChanged = context.newValidationStamp != context.validationStamp;
		context.validationStamp = context.newValidationStamp;

		contextUI.$ui.find(".field.mark-invalid").removeClass("mark-invalid");
		contextUI.$ui.find("[data-element='ef.validation.summary']").each(function (index, element) {
			var $element = $(element);
			$element.find("> .content").html("");
			$element.removeClass("active");
		});

		if (!context.validations || context.validations.length == 0) continue;

		var messages = [];
		var summaryCount = 0;
		var summaryHtml = [];

		for (var validationIndex = 0; validationIndex < context.validations.length; validationIndex++) {
			var validation = context.validations[validationIndex];
			if (!validation.changed) {
				if (validation.path) {
					var itemUI = ef.findItemUI(validation.path);
					if (itemUI != null) {
						var $uiContainer = itemUI.getContainer();
						if ($uiContainer) {
							$uiContainer.addClass("mark-invalid");
						}
						if (!validation.isRelated && itemUI.$ui.length != 0) {
							var message = validation.message ? validation.message : ef.resource("Validation.FieldMessage.Text");
							summaryHtml.push('<div class="item" data-validation-item="' + validation.path + '">');
							summaryHtml.push('<span class="image"></span>');
							summaryHtml.push('<span class="text" title="' + ef.htmlEncode(message) + '">');
							summaryHtml.push(ef.htmlEncode(message));
							summaryHtml.push('</span>');
							summaryHtml.push('<span class="link"><span>Show me</span> &gt;</span>');
							summaryHtml.push('<div>');
							summaryCount++;
						}
					}
				}
				if (validation.message)
					messages.push(validation.message);
			}
		}

		var isValidationSummary = false;
		contextUI.$ui.find("[data-element='ef.validation.summary']").each(function (index, element) {
			if (summaryCount != 0) {
				var $element = $(element);
				$element.find("> .content").html(summaryHtml.join(""));
				$element.addClass("active");
			}
			isValidationSummary = true;
		});

		if (isValidationChanged) {
			if (context.isValidationPopup) {
				context.isValidationPopup = false;
				var messageHtml = null;
				if (!isValidationSummary && messages.length != 0) {
					messageHtml = "";
					for (var i = 0; i < messages.length; i++) {
						if (i != 0) {
							messageHtml += "<br/>";
						}
						messageHtml += ef.htmlEncode(messages[i]);
					}
				}

				ef.validation.alert(messageHtml);
			}
		}
	}
}

ef.validation.alert = function (messageHtml) {
	if (!messageHtml) {
		messageHtml = ef.htmlEncode(ef.resource("Validation.Summary.Text"));
	}
	var html = [];
	html.push('<div data-part="popup:head" class="popup-head">' + ef.resource("Message.Text") + '</div>');
	html.push('<div data-part="popup:content" class="popup-content form validation-form" data-default-button="Close"><p><span class="icon"></span>' + messageHtml + '</p></div>');
	html.push('<div data-part="popup:buttons" class="popup-buttons"><a data-button="Close" class="button" data-cmd=\'c:{"type":"back"}\'><span class="text">' + ef.resource("Close.Text") + '</span></a></div>');

	var popup = ef.popup({
		view: html.join(""),
		width: ef.message.defaultWidth,
		height: "auto",
		cssClass: "validation-popup"
	});
	ef.initCommon(popup.$uiPopup);
}

ef.validation.fieldChanged = function (path) {
	var contextID = ef.parseContextID(path);
	var context = ef.pageModel.contexts[contextID];
	var itemUI = ef.findItemUI(path);
	if (itemUI != null) {
		var $uiContainer = itemUI.getContainer();
		if ($uiContainer) {
			$uiContainer.removeClass("mark-invalid");
		}
	}
	if (context.validations) {
		for (var validationIndex = 0; validationIndex < context.validations.length; validationIndex++) {
			var validation = context.validations[validationIndex];
			if (validation.path && validation.path == path) {
				validation.changed = true;
			}
		}
		ef.validation.apply();
	}
}

ef.validation.isValid = function (path) {
	var parts = path.split(":");
	var contextID = parts[0];
	var fullName = parts[1];
	var context = ef.pageModel.contexts[contextID];
	var isValid = null;
	if (context.validationStamp) {
		if (context.isValid) {
			isValid = true;
		} else {
			isValid = true;
			if (context.validations) {
				for (var validationIndex = 0; validationIndex < context.validations.length; validationIndex++) {
					var validation = context.validations[validationIndex];
					if (validation.path && validation.path.indexOf(path + ".") == 0) {
						isValid = false;
						break;
					}
				}
			}
		}
	}
	return isValid;
}

ef.validation.onClick = function (event) {
	var uiElement = ef.getElement(event.target);
	if (uiElement != null) {
		var $uiTarget = $(event.target);
		var elementID = uiElement.getAttribute("data-element");
		if (elementID == "ef.validation.summary") {
			var $uiSummaryItem = $uiTarget.attr("data-validation-item") ? $uiTarget : $uiTarget.parents("[data-validation-item]");
			if ($uiSummaryItem.length != 0) {
				if ($(uiElement).hasClass("sf-option-show-me-on")) {
					var path = $uiSummaryItem.attr("data-validation-item");
					var itemUI = ef.findItemUI(path);
					if (itemUI != null) {
						var $uiItem = itemUI.getContainer();
						if ($uiItem && $uiItem.length != 0) {
							var scroll = null;
							var itemOffset = $uiItem.offset();
							var wndHeight = ef.$window.height();
							var $uiContainer = itemUI.contextUI.$ui.find(".form-content-pane:first");
							if ($uiContainer.length != 0) {
								var containerOffset = $uiContainer.offset();
								var containerScrollTop = $uiContainer.scrollTop();
								scroll = itemOffset.top - containerOffset.top + containerScrollTop - wndHeight / 2;
							} else {
								$uiContainer = ef.$document;
								scroll = itemOffset.top - wndHeight / 2;
							}
							$uiContainer.scrollTop(scroll);
							if (ef.validation.$uiPointer) {
								clearTimeout(ef.validation._pointerTimeout);
								ef.validation.$uiPointer.remove();
							}
							ef.validation.$uiPointer = $('<div class="validation-pointer">')
								.appendTo("body");
							itemOffset = $uiItem.offset();
							ef.validation.$uiPointer.css({
								left: itemOffset.left + "px",
								top: itemOffset.top + "px"
							});
							ef.validation._pointerTimeout = setTimeout(function () {
								ef.validation.$uiPointer.addClass("on");
								ef.validation._pointerTimeout = setTimeout(function () {
									ef.validation.$uiPointer.removeClass("on");
									ef.validation._pointerTimeout = setTimeout(function () {
										ef.validation.$uiPointer.remove();
									}, 500);
								}, 2000);
							}, 10);
						}
					}
				}
			} else {
				var $uiCmd = $uiTarget.parents("[data-validation-cmd]").addBack("[data-validation-cmd]");
				if ($uiCmd.length != 0) {
					var cmd = $uiCmd.attr("data-validation-cmd");
					if (cmd == "clear") {
						var path = ef.getPath(event.target)
						var contextID = ef.parseContextID(path);
						var context = ef.pageModel.contexts[contextID];
						var contextUI = ef.pageUI.contexts[contextID];
						delete context.validationStamp;
						delete context.isValidationPopup;
						delete context.isValid;
						delete context.validations;
						contextUI.$ui.find(".field.mark-invalid").removeClass("mark-invalid");
						contextUI.$ui.find("[data-element='ef.validation.summary']").each(function (index, element) {
							var $element = $(element);
							$element.find("> .content").html("");
							$element.removeClass("active");
						});
					}
				}
			}
		}
	}
}

ef.applyChangedFields = function () {

	for (var contextID in ef.pageModel.contexts)
		ef.markContextChanged(contextID);
}

ef.markField = function (path, preset) {

	var itemUI = ef.findItemUI(path);

	if (itemUI != null)
		itemUI.fieldUI.markField(preset);
}

ef.activateOnChanges = function (contextID) {

	ef.$ui.find("[data-activate-on-changes][data-path^='" + contextID + ":']").attr("data-disabled", null).removeClass("disabled").show();
}

ef.markContextChanged = function (contextID) {

	var context = ef.pageModel.contexts[contextID];
	var contextUI = ef.pageUI.contexts[contextID];
	var $uiContainer = contextUI.$ui.find(".context-title, .workspace-details-pane:first");

	if (typeof (context.changedFields) != "undefined" && context.changedFields.length != 0)
		$uiContainer.addClass("changed");
	else
		$uiContainer.removeClass("changed");
}

ef.parseContextID = function (path) {
	if (!path) return null;
	var parts = path.split(":");
	var contextID = parts[0];
	return contextID;
}

ef.findItem = function (path) {

	if (!path) return null;

	var parts = path.split(":");
	var contextID = parts[0];
	var fullName = parts[1];

	var context = ef.pageModel.contexts[contextID];

	var item = null;

	if (fullName != "") {
		var segments = fullName.split(".");
		var cursor = context;

		for (var i = 0; i < segments.length; i++) {
			if (cursor == null) break;
			if (cursor.items == null || cursor.items.length == 0) break;
			var segment = segments[i];
			var index = parseInt(segment);
			if (!isNaN(index)) {
				cursor = cursor.items[index];
			} else {
				var resultChildItem = null;
				for (var k = 0; k < cursor.items.length; k++) {
					var chidlItem = cursor.items[k];
					if (chidlItem.id == segment) {
						resultChildItem = chidlItem;
						break;
					}
				}
				cursor = resultChildItem;
			}

			if (i == segments.length - 1)
				item = cursor;
		}
	} else {
		item = context;
	}

	return item;
}

ef.findItemUI = function (path) {

	if (!path) {
		return null;
	}

	var parts = path.split(":");
	if (parts.length == 1) {
		return null;
	}
	var contextID = parts[0];
	var fullName = parts[1];

	var contextUI = ef.pageUI.contexts[contextID];

	var itemUI = null;

	if (fullName != "") {
		var segments = fullName.split(".");
		var cursorUI = contextUI;

		for (var i = 0; i < segments.length; i++) {
			if (cursorUI == null) break;
			if (cursorUI.items == null || cursorUI.items.length == 0) break;
			var segment = segments[i];
			var index = parseInt(segment);
			if (!isNaN(index)) {
				cursorUI = cursorUI.items[index];
			} else {
				var resultChildItemUI = null;
				for (var k = 0; k < cursorUI.items.length; k++) {
					var chidlItemUI = cursorUI.items[k];
					if (chidlItemUI.item.id == segment) {
						resultChildItemUI = chidlItemUI;
						break;
					}
				}
				cursorUI = resultChildItemUI;
			}

			if (i == segments.length - 1)
				itemUI = cursorUI;
		}
	} else {
		itemUI = contextUI;
	}

	return itemUI;
}

ef.findItemUIByID = function (contextID, itemID) {

	var contextUI = ef.pageUI.contexts[contextID];
	var itemUI = ef.findItemUIByIDRecursive(contextUI, itemID);
	return itemUI;
}

ef.findItemUIByIDRecursive = function (parentItemUI, itemID) {

	var itemUI = null;
	if (parentItemUI.items != null && parentItemUI.items.length != 0) {
		for (var itemIndex = 0; itemIndex < parentItemUI.items.length; itemIndex++) {
			var childItemUI = parentItemUI.items[itemIndex];
			if (childItemUI.item.id == itemID) {
				return childItemUI;
			}
			itemUI = ef.findItemUIByIDRecursive(childItemUI, itemID);
			if (itemUI != null) {
				return itemUI;
			}
		}
	}
	return itemUI;
}

ef.findItemByID = function (contextID, itemID) {
	if (!itemID) {
		return null;
	}
	var context = ef.pageModel.contexts[contextID];
	var item = ef.findItemByIDRecursive(context, itemID);
	return item;
}

ef.findItemByIDRecursive = function (parentItem, itemID) {

	var item = null;
	if (parentItem.items != null && parentItem.items.length != 0) {
		for (var itemIndex = 0; itemIndex < parentItem.items.length; itemIndex++) {
			var childItem = parentItem.items[itemIndex];
			if (childItem.id == itemID) {
				return childItem;
			}
			item = ef.findItemByIDRecursive(childItem, itemID);
			if (item != null) {
				return item;
			}
		}
	}
	return item;
}

ef.findItemUIByEID = function (contextID, elementID) {

	var contextUI = ef.pageUI.contexts[contextID];
	var itemUI = ef.findItemUIByEIDRecursive(contextUI, elementID);
	return itemUI;
}

ef.findItemUIByEIDRecursive = function (parentItemUI, elementID) {

	var itemUI = null;
	if (parentItemUI.items != null && parentItemUI.items.length != 0) {
		for (var itemIndex = 0; itemIndex < parentItemUI.items.length; itemIndex++) {
			var childItemUI = parentItemUI.items[itemIndex];
			if (childItemUI.item.eid == elementID) {
				return childItemUI;
			}
			itemUI = ef.findItemUIByEIDRecursive(childItemUI, elementID);
			if (itemUI != null) {
				return itemUI;
			}
		}
	}
	return itemUI;
}

ef.getParentItem = function (item) {
	var lastDotIndex = item.path.lastIndexOf(".");
	var parentPath = item.path.substring(0, lastDotIndex);
	return ef.findItem(parentPath);
}

ef.getItemUIByType = function (itemUI, type) {
	var cursor = itemUI;
	while (cursor != null) {
		if (cursor.item.type === type) {
			return cursor;
		}
		if (cursor.parent != null && cursor.parent !== cursor) {
			cursor = cursor.parent;
		} else {
			break;
		}
	}
	return null;
}

ef.getItemUIByProperty = function (itemUI, name, value) {
	var cursor = itemUI;
	while (cursor != null) {
		if (value === undefined) {
			if (cursor.item[name] !== undefined)
				return cursor;
		} else if (cursor.item[name] === value)
			return cursor;
		if (cursor.parent != null && cursor.parent !== cursor) {
			cursor = cursor.parent;
		} else {
			break;
		}
	}
	return null;
}

ef.isDescendant = function (child, parent) {
	var cursor = child;
	while (cursor != null && cursor != document && cursor.tagName !== "BODY") {
		if (cursor === parent)
			return true;
		cursor = cursor.parentNode;
	}
	return false;
}

ef.message = new function () { };
ef.message.defaultWidth = 300;
ef.message.defaultHeight = 250;

ef.message.show = function (msg, options) {

	var content;
	var contentFormat;
	if (typeof (msg) == "object") {
		if (msg.html != null) {
			content = msg.html;
			contentFormat = "html";
		} else {
			content = msg.text;
			contentFormat = "text";
		}
	} else {
		content = msg;
		contentFormat = "text";
	}

	var html = [];
	html.push('<div data-part="popup:head" class="popup-head">' + (options && options.title ? ef.htmlEncode(options.title) : ef.htmlEncode(ef.resource("Message.Text"))) + '</div>');
	html.push('<div data-part="popup:content" class="popup-content form" data-default-button="Close">');
	if (contentFormat == "html") {
		html.push(content);
	} else {
		html.push('<p>' + ef.htmlEncode(content).replace(/\n/g, "<br/>") + '</p>');
	}
	html.push('</div>');
	html.push('<div data-part="popup:buttons" class="popup-buttons"><a data-button="Close" class="button" data-cmd=\'c:{"type":"back"}\'><span class="text">' + ef.resource("Close.Text") + '</span></a></div>');

	var popup = ef.popup({
		view: html.join(""),
		width: options && options.width ? options.width : ef.message.defaultWidth,
		height: options && options.height ? options.height : ef.message.defaultHeight,
		cssClass: options && options.style ? options.style : "message"
	});
	ef.initCommon(popup.$uiPopup);
}

ef.message.showInline = function (msg, itemUI) {

	var $ui = itemUI ? itemUI.$ui : $("body");
	$ui.find("[data-part='context:message']").remove();

	var content;
	var contentFormat;
	if (typeof (msg) == "object") {
		if (msg.html != null) {
			content = msg.html;
			contentFormat = "html";
		} else {
			content = msg.text;
			contentFormat = "text";
		}
	} else {
		content = msg;
		contentFormat = "text";
	}

	var html = [];
	html.push('<div data-part="context:message" class="context-message" style="display: none;">');
	if (contentFormat == "html") {
		html.push(content);
	} else {
		html.push(ef.htmlEncode(content).replace(/\n/g, "<br/>"));
	}
	html.push('<a class="cmd-close" data-cmd=\'c:{"type":"message","cmd":"close"}\'><span></span></a>');
	html.push('</div>');

	var isPopup = $ui.parents("[data-control='popup']:first").length != 0;

	if (isPopup) {
		// Instert in popup container.
		//var $uiPopupContent = $ui.find(".popup-content:first");
		//$uiPopupContent.prepend(html.join(""));
		$ui.prepend(html.join(""));
	} else {
		// Skip title.
		var $uiTitle = $ui.find("> h1:first");

		if ($uiTitle.length != 0)
			$uiTitle.after(html.join(""));
		else
			$ui.prepend(html.join(""));
	}

	var $uiMessage = $ui.find("[data-part='context:message']:first");
	$uiMessage.slideDown();
	ef.initCommon($uiMessage);

	clearTimeout(ef.message._hideTimeout);
	ef.message._hideTimeout = setTimeout(function () {
		ef.message.hide($uiMessage[0]);
	}, 5000);
	$uiMessage.on("click", function () {
		ef.message.hide($uiMessage[0]);
	});
}

ef.message.hideInline = function (itemUI) {
	if (!itemUI) {
		return;
	}
	itemUI.$ui.find("[data-part='context:message']").remove();
}

ef.message.hide = function (uiCmd, data) {

	clearTimeout(ef.message._hideTimeout);

	var $uiMessage;

	if (uiCmd.getAttribute("data-part") == "context:message")
		$uiMessage = $(uiCmd);
	else
		$uiMessage = $(uiCmd).parents("[data-part='context:message']:first");

	$uiMessage.slideUp(function () { $uiMessage.remove(); });
}

ef.dblClick = function (event) {

	var $uiCmd = $(this);

	var data = $.parseJSON($uiCmd.attr("data-dblclick"));

	ef.clientCmd(this, data);

	ef.clearSelection();
	event.preventDefault();
	return false;
}

ef.clientCmd = function (uiCmd, data) {

	var $uiCmd = $(uiCmd);

	if (data.type == "url") {
		window.open(data.url, data.target || "_self");
	} else if (data.type == "back") {
		var $uiPopup = $uiCmd.parents("[data-control='popup']:first");
		if ($uiPopup.length != 0) {
			ef.closePopup($uiPopup[0]);
		} else {
			ef.setCookie("back", "1");
			window.history.back();
		}
	} else if (data.type == "popup") {
		var $uiPopup = $uiCmd.parents("[data-control='popup']:first");
		if (data.cmd == "close") {
			ef.closeLookups();
			ef.closePopup($uiPopup[0]);
		}
	} else if (data.type == "grid") {
		var path = ef.getPath(uiCmd);
		ef.activeItem = path;
		var itemUI = ef.findItemUI(path);
		var gridUI = ef.getItemUIByType(itemUI, "grid").gridUI;
		gridUI.cmd(uiCmd, data);
	} else if (data.type == "tabs") {
		var path = ef.getPath(uiCmd);
		var itemUI = ef.findItemUI(path);
		itemUI.cmd(uiCmd, data);
	} else if (data.type == "field") {
		var path = ef.getPath(uiCmd);
		var itemUI = ef.findItemUI(path);
		itemUI.cmd(uiCmd, data);
	} else if (data.type == "item") {
		var path = ef.getPath(uiCmd);
		var itemUI = ef.findItemUI(path);
		itemUI.cmd(uiCmd, data);
	} else if (data.type == "nav") {
		if (data.cmd == "toggleMenu") {
			var $uiNav = $("[data-part='nav']:first");
			if ($uiNav.is(":hidden")) {
				$uiNav.slideDown();
			} else {
				$uiNav.slideUp();
			}
		}
	} else if (data.type == "message") {
		if (data.cmd == "close") {
			ef.message.hide(uiCmd, data);
		}
	} else if (data.type == "menu") {
		if (typeof (data.menu) == "object") {
			var path = ef.getPath(uiCmd);
			ef.activeItem = path;
			var itemUI = ef.findItemUI(path);
			if (itemUI) {
				ef.menu.show(uiCmd, data.menu, { path: itemUI.item.path });
			} else {
				ef.menu.show(uiCmd, data.menu);
			}
		} else {
			var path = ef.getPath(uiCmd);
			ef.activeItem = path;
			var itemUI = ef.findItemUI(path);
			if (!itemUI.item.menu)
				throw ("Menu for item \"" + path + "\" was not found.");
			ef.menu.show(uiCmd, itemUI.item.menu, { path: itemUI.item.path });
		}
	} else if (data.type == "history") {
		if (data.cmd == "back")
			history.back();
		else if (data.cmd == "forward")
			history.forward();

	} else if (data.type == "unsavedChangesRequest") {
		var $uiPopup = $uiCmd.parents("[data-control='popup']:first");
		ef.closePopup($uiPopup[0]);
		var cmdState = ef._cmdStack.pop();
		cmdState.options.unsavedChangesRequest = false;
		if (data.cmd == "save") {
			cmdState.options.saveChanges = true;
			ef.cmd(cmdState.cmd, cmdState.uiCmd, cmdState.options);
		} else if (data.cmd == "continueWithoutSaving") {
			cmdState.options.saveChanges = false;
			ef.cmd(cmdState.cmd, cmdState.uiCmd, cmdState.options);
		}
	} else if (data.type == "confirm") {
		var $uiPopup = $uiCmd.parents("[data-control='popup']:first");
		ef.closePopup($uiPopup[0]);
		if (typeof (ef.confirm.callbacks[data.cmd]) === "function") {
			ef.confirm.callbacks[data.cmd]();
		}
	} else if (data.type == "ide") {
		data.uiCmd = uiCmd;
		ide.cmd(data);
	} else if (data.type == "design") {
		data.uiCmd = uiCmd;
		ef.design.cmd(data);
	} else if (data.type == "comments") {
		ef.comments.cmd(data);
	} else if (data.type == "ws") {
		data.uiCmd = uiCmd;
		ws.cmd(data);
	} else if (data.type == "webTerminal") {
		webTerminal.cmd(data);
	} else {
		ef.forward(ef, ef._eventChildren, "cmd", data);
	}
}

$.fn.serializeObject = function () {
	var o = {};
	var a = this.find("input, select, textarea, button").serializeArray();
	$.each(a, function () {
		if (o[this.name] !== undefined) {
			if (!o[this.name].push) {
				o[this.name] = [o[this.name]];
			}
			o[this.name].push(this.value || '');
		} else {
			o[this.name] = this.value || '';
		}
	});
	return o;
};

ef.clearSelection = function () {

	if (window.getSelection) {
		if (window.getSelection().empty) {  // Chrome
			window.getSelection().empty();
		} else if (window.getSelection().removeAllRanges) {  // Firefox
			window.getSelection().removeAllRanges();
		}
	} else if (document.selection) {  // IE?
		document.selection.empty();
	}
}

ef.loading = new function () { };

ef.loading.show = function () {
	var $uiLoading = $("#loading");
	if ($uiLoading.length == 0) {
		$uiLoading = $("<div class='loading'><div class='box'></div><div class='text'>loading</div></div>")
			.attr("id", "loading")
			.appendTo("body");
		clearTimeout(ef.loading._showTimeout);
		ef.loading._showTimeout = setTimeout(function () {
			$uiLoading.addClass("active");
		}, 200);
	}
}

ef.loading.hide = function () {
	clearTimeout(ef.loading._showTimeout);
	$("#loading").remove();
}

ef.focus = function ($uiContainer, tabindexOnly) {

	if ($uiContainer) {
		var $element = $uiContainer.is("input") ? $uiContainer : $uiContainer.find("[tabindex='1']:first").addBack("[tabindex='1']:first");

		if ($element.length === 0 && !tabindexOnly) {
			if ($element.length == 0)
				$element = $uiContainer.find("input:visible:first");

			if ($element.length == 0) {
				var $uiDefaultButtonContainer = $uiContainer.find("[data-default-button]:first");
				if ($uiDefaultButtonContainer.length != 0) {
					var $element = $uiDefaultButtonContainer.find("[data-button='" + $uiDefaultButtonContainer.attr("data-default-button") + "']");
					if ($element.length == 0) {
						$element = $uiDefaultButtonContainer.parents("[data-control='popup']:first").find("[data-button='" + $uiDefaultButtonContainer.attr("data-default-button") + "']");
						if ($element.length == 0)
							$element = $uiDefaultButtonContainer.parents("[data-context]:first").find("[data-button='" + $uiDefaultButtonContainer.attr("data-default-button") + "']");
					}
				}
			}
		}

		if ($element.length != 0 && !ef.isLocked($element) && !$element.is(".grid.autosize-off")) {
			$element.focus();
			if ($element.is("input")) {
				$element.attr("tabindex", "1");
				$element.mouseup();
			}
		}
	} else {
		if (ef.popups.length != 0) {
			var popup = ef.popups[ef.popups.length - 1];
			ef.focus(popup.$uiPopup, true);
		}
	}
}

ef.isLocked = function ($element) {

	var isLocked = false;
	var $uiPopup = $element.parents("[data-control='popup']:first");
	if ($uiPopup.length != 0) {
		var popup = $uiPopup.data("popup");
		if (ef.popups.indexOf(popup) != ef.popups.length - 1) {
			isLocked = true;
		}
	} else {
		if (ef.popups.length != 0) {
			isLocked = true;
		}
	}
	return isLocked;
}

ef.findDefaultButton = function ($uiTarget) {

	var $uiCmd = null;
	var $uiDefaultButtonContainer = $uiTarget.parents("[data-default-button]:first");
	if ($uiDefaultButtonContainer.length != 0) {
		var $uiCmd = $uiDefaultButtonContainer.find("[data-button='" + $uiDefaultButtonContainer.attr("data-default-button") + "']");
		if ($uiCmd.length == 0)
			$uiCmd = $uiDefaultButtonContainer.parents("[data-context]:first").find("[data-button='" + $uiDefaultButtonContainer.attr("data-default-button") + "']");
	}
	return $uiCmd != null && $uiCmd.length != 0 ? $uiCmd : null;
}

// Array Remove - By John Resig (MIT Licensed)
Array.prototype.remove = function (from, to) {
	var rest = this.slice((to || from) + 1 || this.length);
	this.length = from < 0 ? this.length + from : from;
	return this.push.apply(this, rest);
};

ef.popups = [];

ef.getPopupID = function () {

	ef._popupIndex = typeof (ef._popupIndex) == "undefined" ? 1 : ++ef._popupIndex;

	return "popup" + ef._popupIndex;
}

ef.popup = function (options) {

	var $uiPopup = $("<div>")
		.attr("id", ef.getPopupID())
		.attr("data-control", "popup")
		.addClass("popup")
		.prepend("<a data-cmd='c:{\"type\":\"popup\",\"cmd\":\"close\"}' class='cmd-close'><span></span></a>")
		.append("<a data-popup-part='resize' class='popup-resize'><span></span></a>")
		.appendTo("body");

	if (options && options.cssClass)
		$uiPopup.addClass(options.cssClass);

	$uiPopup.append(options.view);

	var zIndex = parseInt($uiPopup.css("z-index")) + ef.popups.length * 2;

	$uiPopup.css("z-index", zIndex + "");

	var popup = {
		options: options,
		$uiPopup: $uiPopup
	};

	$uiPopup.data("popup", popup);

	ef.popups.push(popup);

	ef.overlay.show({
		click: ef.popup.onOverlayClick
	});

	ef.setPopup(popup);

	if ($uiPopup.is(".express-popup")) {
		setTimeout(function () {
			ef.focus($uiPopup, true);
		}, 1);
	} else {
		var callback = function () {
			$uiPopup.removeClass("preshow showing");
			ef.focus($uiPopup, true);
		}
		var isProcessed = false;
		if (typeof (ws) != "undefined" && ws.popup !== undefined && typeof (ws.popup.showPopup) === "function")
			isProcessed = ws.popup.showPopup(popup, callback);
		if (!isProcessed) {
			$uiPopup.addClass("preshowinit");
			setTimeout(function () {
				$uiPopup.addClass("preshow");
				$uiPopup.removeClass("preshowinit");
				setTimeout(function () {
					$uiPopup.addClass("showing");
					//ef.focus($uiPopup);
					setTimeout(function () {
						$uiPopup.removeClass("preshow showing");
						ef.focus($uiPopup, true);
					}, 350);
				}, 1);
			}, 1);
		}
	}


	$uiPopup.find("[data-popup-part='resize']").on("mousedown.ef", ef.popup.onResizeMouseDown);

	return popup;
}

ef.findPopup = function (uiPopup) {

	var index = -1;

	for (var i = 0; i < ef.popups.length; i++) {
		var popup = ef.popups[i];
		if (popup.$uiPopup[0] == uiPopup) {
			index = i;
			break;
		}
	}

	return index;
}

ef.setPopup = function (popup) {

	var popups = popup ? [popup] : ef.popups;

	for (var i = 0; i < popups.length; i++) {

		var popup = popups[i];

		var isProcessed = false;

		if (typeof (ws) != "undefined" && ws.popup !== undefined && typeof (ws.popup.setPopup) == "function")
			isProcessed = ws.popup.setPopup(popup);

		if (!isProcessed) {
			var options = popup.options;
			var $uiPopup = popup.$uiPopup;

			var wndWidth = ef.$window.width();
			var wndHeight = ef.iframeBounds ? ef.iframeBounds.windowHeight : ef.$window.height();
			var popupWidth;
			var popupHeight;
			var left, top;
			var $uiAttachTo = options && options.attachTo ? $("[data-path='" + options.attachTo + "']") : null;
			if ($uiAttachTo && $uiAttachTo.length === 0) {
				$uiAttachTo = null;
			}

			if (options && options.width) {
				var width = options.width;
				if (width[width.length - 1] == "%") {
					width = parseFloat(width);
					popupWidth = Math.floor(wndWidth * width / 100);
				} else {
					popupWidth = parseInt(width);
				}
			} else {
				popupWidth = 500;
			}

			if (popupWidth > wndWidth * 0.95)
				popupWidth = Math.floor(wndWidth * 0.95);

			if (options && options.height) {
				var height = options.height;
				if (height === "auto") {
					popupHeight = $uiPopup.outerHeight() + 10;
				} else if (height[height.length - 1] == "%") {
					height = parseFloat(height);
					popupHeight = Math.floor(wndHeight * height / 100);
				} else {
					popupHeight = parseInt(height);
				}
			} else {
				popupHeight = 350;
			}

			if (popupHeight > wndHeight * 0.95)
				popupHeight = Math.floor(wndHeight * 0.95);

			if ($uiAttachTo !== null) {
				var cmdOffset = $uiAttachTo.offset();
				var cmdHeight = $uiAttachTo.outerHeight();
				var cmdWidth = $uiAttachTo.outerWidth(true);
				var windowWidth = $(window).width();
				var windowHeight = $(window).height();
				var documentScrollLeft = $(document).scrollLeft();
				var documentScrollTop = $(document).scrollTop();

				var left;
				if ($uiAttachTo[0].tagName === "TR") {
					var $uiGrid = $uiAttachTo.parents("[data-grid]:first");
					if ($uiGrid.length == 0)
						$uiGrid = $uiAttachTo.parents("table:first");
					left = $uiGrid.offset().left + $uiGrid.outerWidth() / 2;
					if (left - documentScrollLeft + popupWidth > windowWidth)
						left = documentScrollLeft + windowWidth - popupWidth - 15;
				} else {
					left = cmdOffset.left + cmdWidth + 15; //(cmdOffset.left + cmdWidth - popupWidth / 2);
					if (left - documentScrollLeft + popupWidth > windowWidth)
						left = cmdOffset.left - popupWidth - 15;
				}

				if (left < 0) {
					left = 0;
				}

				top = cmdOffset.top - 15;
				if (top - documentScrollTop + popupHeight > windowHeight - 5) {
					if (windowHeight >= 500 && (windowHeight - (top - documentScrollTop) < 220)) {
						top = cmdOffset.top - popupHeight - 5;
					} else if (cmdOffset.top - popupHeight >= documentScrollTop) {
						top = cmdOffset.top - popupHeight - 5;
					}
				}
			} else {
				if (popupWidth > wndWidth) {
					left = 0;
				} else {
					left = Math.floor((wndWidth - popupWidth) / 2);
				}

				if (popupHeight > wndHeight) {
					top = ef.$document.scrollTop();
				} else {
					top = Math.floor((wndHeight - popupHeight) / 2) + ef.$document.scrollTop();
				}

				if (ef.iframeBounds) {
					top -= ef.iframeBounds.offset.top;
					left -= ef.iframeBounds.offset.left / 2;
				}

				if (left < 0)
					left = 0;

				if (top < 0)
					top = 0;
			}

			popup.width = popupWidth;
			popup.height = popupHeight;

			$uiPopup.css({
				"width": popupWidth + "px",
				"height": options && options.height == "auto" ? "auto" : popupHeight + "px",
				"left": left + "px",
				"top": top + "px"
			});

			if (options && options.height == "auto") {
				$uiPopup.addClass("auto-height");
			}

			// Dragging
			var $uiHead = $uiPopup.find("[data-part='popup:head']:first");
			if ($uiHead.length != 0) {
				if (!$uiHead.data("ef_popup_dragging")) {
					$uiHead.data("ef_popup_dragging", true)
					$uiHead.on("mousedown.ef", ef.popup.onHeadMouseDown);
				}
			}
		}

		ef.popup.setCallouts(popup);
		ef.setPopupContent(popup);
	}
}

ef.setPopupContent = function (popup) {

	var isProcessed = false;

	if (typeof (ws) != "undefined" && typeof (ws.setWorkspace) == "function")
		isProcessed = ws.setWorkspace(popup);

	if (!isProcessed) {
		var $uiPopup = popup.$uiPopup;
		var $uiContent = $uiPopup.find("[data-part='popup:content']:first");
		if ($uiContent.length != 0) {
			// Content size.
			var $uiHead = $uiPopup.find("[data-part='popup:head']:first");
			var $uiButtons = $uiPopup.find("[data-part='popup:buttons']:first");
			var contentWidth = Math.floor(popup.width);
			var contentHeight = Math.floor(popup.height - ($uiHead.length != 0 ? $uiHead.outerHeight(true) : 0) - ($uiButtons.length != 0 ? $uiButtons.outerHeight(true) : 0));
			var $uiTabs = $uiContent.find("> [data-tabs]");
			var $uiAutosizeContainer;
			if ($uiTabs.length != 0) {
				var $uiTabsHead = $uiTabs.find("> .tabs-head");
				var $uiTabsContent = $uiTabs.find("> .tabs-content");
				contentHeight -= Math.ceil(($uiContent.outerHeight() - $uiContent.height()) + $uiTabsHead.outerHeight(true));
				contentWidth -= Math.ceil($uiContent.outerWidth() - $uiContent.width() + 2);
				$uiTabsContent.css({
					"width": contentWidth + "px",
					"height": contentHeight + "px"
				});
				$uiAutosizeContainer = $uiTabsContent;
			} else {
				$uiContent.css({
					"width": contentWidth + "px",
					"height": popup.options && popup.options.height == "auto" ? "auto" : contentHeight + "px"
				});
				$uiAutosizeContainer = $uiContent;
			}
			$uiContent.find(".autosize").each(function (index, uiItem) {
				if (uiItem.getAttribute("data-grid"))
					return;
				var $uiItem = $(uiItem);
				var containerHeight = $uiAutosizeContainer.innerHeight();
				var containerPaddings = $uiAutosizeContainer.innerHeight() - $uiAutosizeContainer.height();
				var firstChildOffset = $uiAutosizeContainer.find("> :visible:first").offset();
				var itemOffset = $uiItem.offset();
				var itemHeight = Math.floor(containerHeight - (itemOffset.top - firstChildOffset.top + containerPaddings));
				$uiItem.css("height", itemHeight + "px");
			});
			var $uiGrid = $uiContent.find("[data-grid]");
			if ($uiGrid.length != 0) {
				if ($uiGrid.data("GridUI") != null) {
					var gridUI = $uiGrid.data("GridUI");
					gridUI.setWorkspace();
				}
			}
		}
	}
}

ef.closePopup = function (el, options) {

	ef.closeLookups();
	var $uiPopup = $(el).is("[data-control='popup']") ? $(el) : $(el).parents("[data-control='popup']:first");

	var popup = $uiPopup.data("popup");
	if (popup.options && popup.options.onClose && !(options && options.force)) {
		setTimeout(function () {
			if (typeof (popup.options.onClose) === "function")
				popup.options.onClose();
			else
				ef.cmd(popup.options.onClose, $uiPopup.find("[data-path]:first")[0]);
		}, 10);
		return;
	}

	var callback = function () {
		$uiPopup.html("").remove();
	};
	var isProcessed = false;
	if (typeof (ws) != "undefined" && ws.popup !== undefined && typeof (ws.popup.hidePopup) === "function")
		isProcessed = ws.popup.hidePopup(popup, callback);
	if (!isProcessed) {
		$uiPopup.addClass("prehide");
		setTimeout(function () {
			$uiPopup.addClass("hiding");
			setTimeout(function () {
				callback();
			}, 350);
		}, 1);
	}

	if (popup.$arrow)
		popup.$arrow.remove();

	if (popup.$attachToHighlighting)
		popup.$attachToHighlighting.remove();

	if (popup.$uiOriginator)
		popup.$uiOriginator.removeClass("popup-originator");

	var index = ef.findPopup(popup.$uiPopup[0]);
	ef.popups.remove(index);

	if (popup.context) {
		delete ef.pageModel.contexts[popup.context];
		delete ef.pageUI.contexts[popup.context];
	}

	if (ef.popups.length == 0 && $("#galleryPopup").length == 0)
		ef.overlay.hide();
	else
		ef.overlay.set();

	ef.focus();
}

ef.popup.onHeadMouseDown = function (event) {

	if (ef.getElement(event.target, "data-ide") != null) {
		return;
	}
	ef.overlay.lock();
	ef.popup.moving = true;
	var $uiPopup = $(this).parents("[data-control='popup']:first");
	var popup = $uiPopup.data("popup");
	var offset = $uiPopup.offset();
	ef.popup.movingData = {
		popup: popup,
		initialLeft: offset.left,
		initialTop: offset.top
	}
	ef.onMouseDown(event);
	event.preventDefault();
	return false;
}

ef.popup.onResizeMouseDown = function (event) {

	ef.overlay.lock();
	ef.popup.resizing = true;
	var $uiPopup = $(this).parents("[data-control='popup']:first");
	var popup = $uiPopup.data("popup");
	ef.popup.resizingData = {
		popup: popup,
		initialWidth: $uiPopup.width(),
		initialHeight: $uiPopup.height()
	}
	ef.onMouseDown(event);
	event.preventDefault();
	return false;
}

ef.popup.move = function (event) {

	var offsetX = event.pageX - ef.pointerData.downPageX;
	var offsetY = event.pageY - ef.pointerData.downPageY;
	var left = ef.popup.movingData.initialLeft + offsetX;
	var top = ef.popup.movingData.initialTop + offsetY;
	if (left < 0) left = 0;
	if (top < 0) top = 0;

	var popup = ef.popup.movingData.popup;
	var $uiPopup = popup.$uiPopup;

	$uiPopup.css({
		"left": left + "px",
		"top": top + "px"
	});

	ef.popup.setCallouts(popup);
}

ef.popup.resize = function (event) {

	var offsetX = event.pageX - ef.pointerData.downPageX;
	var offsetY = event.pageY - ef.pointerData.downPageY;
	var width = ef.popup.resizingData.initialWidth + offsetX;
	var height = ef.popup.resizingData.initialHeight + offsetY;
	if (width < 30) width = 50;
	if (height < 30) height = 0;
	var popup = ef.popup.resizingData.popup;
	popup.width = width;
	popup.height = height;
	var $uiPopup = popup.$uiPopup;

	$uiPopup.css({
		"width": width + "px",
		"height": height + "px"
	});

	ef.setPopupContent(popup);
}

ef.popup.setCallouts = function (popup) {
	var options = popup.options;

	// Attach to.
	var $uiAttachTo = options && options.attachTo ? $("[data-path='" + options.attachTo + "']") : null;
	if ($uiAttachTo && $uiAttachTo.length !== 0) {
		var $uiPopup = popup.$uiPopup;
		var popupWidth = $uiPopup.outerWidth();
		var popupHeight = $uiPopup.outerHeight();
		var popupOffset = $uiPopup.offset();
		var cmdOffset;
		var cmdHeight;
		var cmdWidth;

		if ($uiAttachTo[0].tagName === "TR") {
			var $uiGrid = $uiAttachTo.parents("[data-grid]:first");
			if ($uiGrid.length == 0)
				$uiGrid = $uiAttachTo.parents("table:first");
			cmdOffset = {
				left: $uiGrid.offset().left,
				top: $uiAttachTo.offset().top
			}
			cmdHeight = $uiAttachTo.outerHeight();
			cmdWidth = $uiGrid.outerWidth(true);
		} else {
			cmdOffset = $uiAttachTo.offset();
			cmdHeight = $uiAttachTo.outerHeight();
			cmdWidth = $uiAttachTo.outerWidth(true);
		}

		var arrowFrom = {
			x: popupOffset.left + popupWidth >= cmdOffset.left ? popupOffset.left : popupOffset.left + popupWidth,
			y: popupOffset.top + popupHeight >= cmdOffset.top ? popupOffset.top : popupOffset.top + popupHeight,
		}
		var arrowTo = {
			x: arrowFrom.x > cmdOffset.left + cmdWidth ? cmdOffset.left + cmdWidth :
				arrowFrom.x >= cmdOffset.left && arrowFrom.x <= cmdOffset.left + cmdWidth ? arrowFrom.x : cmdOffset.left,
			y: arrowFrom.y < cmdOffset.top ? cmdOffset.top :
				arrowFrom.y >= cmdOffset.top && arrowFrom.y <= cmdOffset.top + cmdHeight ? arrowFrom.y : cmdOffset.top + cmdHeight
		}
		var canvasPad = 5;
		var canvasLeft = Math.min(arrowTo.x, arrowFrom.x) - canvasPad;
		var canvasTop = Math.min(arrowTo.y, arrowFrom.y) - canvasPad;
		var canvasWidth = Math.abs(arrowFrom.x - arrowTo.x) + canvasPad * 2;
		var canvasHeight = Math.abs(arrowFrom.y - arrowTo.y) + canvasPad * 2;
		// Arrow.
		if (popup.$arrow) {
			popup.$arrow.remove();
		}
		var arrowHtml = [];
		arrowHtml.push('<svg>');
		arrowHtml.push('<defs>');
		arrowHtml.push('<marker id="arrow" markerWidth="10" markerHeight="10" refX="6" refY="3" orient="auto" markerUnits="strokeWidth">');
		arrowHtml.push('<path d="M0,0 L0,6 L9,3 z" fill="#0072C6" />');
		arrowHtml.push('</marker>');
		arrowHtml.push('</defs>');
		arrowHtml.push('<line x1="' + (arrowFrom.x - canvasLeft) + '.5" y1="' + (arrowFrom.y - canvasTop) + '.5" x2="' + (arrowTo.x - canvasLeft) + '.5" y2="' + (arrowTo.y - canvasTop) + '.5" stroke="#0072C6" stroke-width="1" marker-end="url(#arrow)" />');
		arrowHtml.push('</svg>');
		popup.$arrow = $(arrowHtml.join("")).appendTo("body");
		popup.$arrow
			.attr("class", "popup-arrow")
			.attr("width", canvasWidth + "px")
			.attr("height", canvasHeight + "px")
			.css({
				"z-index": parseInt($uiPopup.css("z-index")) - 1,
				"left": canvasLeft + "px",
				"top": canvasTop + "px"
			});
		// Item highlighting.
		if (popup.$attachToHighlighting) {
			popup.$attachToHighlighting.remove();
		}
		popup.$attachToHighlighting = $("<div class='express-popup-highlighting'></div>")
			.css({
				"z-index": parseInt($uiPopup.css("z-index")) - 1,
				"left": cmdOffset.left + "px",
				"top": cmdOffset.top + "px",
				"width": cmdWidth + "px",
				"height": cmdHeight + "px"
			})
			.appendTo("body");
	}

	// Originator.
	var $uiOriginator = options && options.originator ? $("[data-path='" + options.originator + "']") : null;
	if ($uiOriginator && $uiOriginator.length !== 0) {
		popup.$uiOriginator = $uiOriginator;
		popup.$uiOriginator.addClass("popup-originator");
	}
}

ef.popup.onOverlayClick = function () {
	if (ef.popups.length != 0) {
		var popup = ef.popups[ef.popups.length - 1];
		var $uiPopup = popup.$uiPopup;
		if ($uiPopup.is(".express-popup")) {
			ef.closePopup(popup.$uiPopup[0]);
		}
	}
}

ef.overlay = new function () { };
ef.overlay._defaultZIndex = 10;

ef.overlay.show = function (options) {

	ef.overlay._visible = true;

	var $uiOverlay = $("#overlay");
	if ($uiOverlay.length == 0)
		$uiOverlay = $("<div>")
			.attr("id", "overlay")
			.appendTo("body");

	var wndWidth1 = ef.$window.width();

	document.documentElement.style.overflow = "hidden";

	var wndWidth2 = ef.$window.width();

	var scrollWidth = wndWidth2 - wndWidth1;

	$("body").css("margin-right", scrollWidth + "px");

	ef.overlay.set();

	$uiOverlay.show();
	setTimeout(function () { $uiOverlay.css("opacity", "1"); }, 10);

	$uiOverlay.unbind("click");

	if (options && options.click)
		$uiOverlay.click(options.click);
}

ef.overlay.set = function () {

	var $uiOverlay = $("#overlay");
	if ($uiOverlay.length == 0)
		return;

	var zIndex = ef.overlay._defaultZIndex;

	if (ef.popups.length != 0) {
		var popup = ef.popups[ef.popups.length - 1];
		var $uiPopup = popup.$uiPopup;
		var zIndex = parseInt($uiPopup.css("z-index")) - 1;
	}

	$uiOverlay.css({
		"left": ef.$document.scrollLeft() + "px",
		"top": ef.$document.scrollTop() + "px",
		"width": ef.$window.width() + "px",
		"height": ef.$window.height() + "px",
		"z-index": zIndex + ""
	});
}

ef.overlay.hide = function () {

	ef.overlay._visible = false;

	var $uiOverlay = $("#overlay");
	document.documentElement.style.overflow = "";
	$("body").css("margin-right", "");
	setTimeout(function () { if (ef.overlay._visible) return; $uiOverlay.css("opacity", "0"); }, 10);
	setTimeout(function () { if (ef.overlay._visible) return; $uiOverlay.hide(); }, 250);
}

ef.overlay.lock = function (options) {

	var $uiOverlay = $("#lockOverlay");
	if ($uiOverlay.length == 0)
		$uiOverlay = $("<div>")
			.attr("id", "lockOverlay")
			.appendTo("body");

	if (options && options.cssClass)
		$uiOverlay.addClass(options.cssClass);

	$uiOverlay.show();
}

ef.overlay.unlock = function () {

	var $uiOverlay = $("#lockOverlay");
	if ($uiOverlay.length != 0)
		$uiOverlay.remove();
}

ef.forwardEvent = function (obj, children, data) {
	ef.forward(obj, children, "onEvent", data);
}

ef.forward = function (obj, children, action, data) {
	for (var i = 0; i < children.length; i++) {
		var child = obj[children[i]];
		if (typeof (child) != "undefined" && child.active && typeof (child[action]) == "function") {
			child[action](data);
		}
	}
}

ef.onResize = function () {
	if (typeof (ws) !== "undefined" && typeof (ws.setWorkspace) === "function")
		ws.setWorkspace();
	ef.overlay.set();
	if (!ef.isInFrame) {
		ef.setPopup();
		ef.setGallery();

		if (typeof (ef.forms) != "undefined" && typeof (ef.forms.onResize) == "function")
			ef.forms.onResize();
	}
}

ef.onClick = function (event) {

	if (event.target) {
		var element = ef.getElement(event.target);
		if (element != null) {
			var elementID = element.getAttribute("data-element");
			if (elementID == "ef.menu") {
				ef.menu.onClick(event);
			} else if (elementID == "ef.validation.summary") {
				ef.validation.onClick(event);
			} else if (elementID.indexOf("ef.field.") === 0) {
				ef.field.onEvent({ event: event, element: element, eventName: "Click", elementName: element != null ? element.getAttribute("data-element") : "" });
			} else if (elementID.indexOf("ef.widget.") === 0) {
				ef.widget.onEvent({ event: event, element: element, eventName: "Click", elementName: element != null ? element.getAttribute("data-element") : "" });
			} else if (elementID.indexOf("sf.widget.") === 0) {
				sf.widget.onClick(event, element);
			}
		}

		if (typeof (ws) != "undefined" && typeof (ws.onEvent) == "function") {
			ws.onEvent({ event: event, element: element, eventName: "Click", elementName: element != null ? element.getAttribute("data-element") : "" });
		}

		ef.nav.onEvent({ event: event, element: element, eventName: "Click", elementName: element != null ? element.getAttribute("data-element") : "" });

		var $uiTarget = $(event.target);
		var $uiField = $uiTarget.parents("[data-part='field']:first");
		if ($uiField.length != 0) {
			var $uiTargetLabel = $uiTarget.hasClass("field-label") ? $uiTarget : $uiTarget.parents(".field-label:first");
			if ($uiTargetLabel.length != 0) {
				if ($uiField.hasClass("expand")) {
					$uiField.removeClass("expand").addClass("collapse");
				} else if ($uiField.hasClass("collapse")) {
					$uiField.removeClass("collapse").addClass("expand");
				}
			}
		}

		if (ef.graphics && ef.graphics.active)
			ef.graphics.onEvent({ event: event, element: element, eventName: "Click", elementName: element != null ? element.getAttribute("data-element") : "" });

		ef.forwardEvent(ef, ef._eventChildren, { event: event, element: element, eventName: "Click", elementName: element != null ? element.getAttribute("data-element") : "" });
	}

	if (event.isPropagationStopped()) {
		return event.isDefaultPrevented() ? false : null;
	}

	if (typeof (sf) != "undefined" && typeof (sf.comments) != "undefined" && typeof (sf.comments.onClick) == "function") {
		sf.comments.onClick(event);
	}
}

ef.onContextMenu = function (event) {

	var element = ef.getElement(event.target);

	if (typeof (ide) != "undefined" && typeof (ide.onEvent) == "function")
		ide.onEvent({ event: event, element: element, eventName: "ContextMenu", elementName: element != null ? element.getAttribute("data-element") : "" });

	if (event.isPropagationStopped())
		return;

	if (ef.graphics && ef.graphics.active)
		ef.graphics.onEvent({ event: event, element: element, eventName: "ContextMenu", elementName: element != null ? element.getAttribute("data-element") : "" });

	if (event.isPropagationStopped())
		return;

	var itemUI = ef.getTargetItemUI(event.target);
	if (itemUI != null)
		itemUI.onEvent({ event: event, element: element, eventName: "ContextMenu", elementName: element != null ? element.getAttribute("data-element") : "" });

	if (event.isPropagationStopped())
		return;

	if (typeof (sf) != "undefined" && typeof (sf.comments) != "undefined" && sf.comments.enabled) {
		if (itemUI != null) {
			if (itemUI.contextUI.context.comments && itemUI.contextUI.context.comments.edit) {
				if (itemUI.item.eid) {
					var menu = {
						items: [],
						select: ef._onContextMenuSelect
					};
					menu.items.push({
						image: "comment",
						name: "Comment",
						cmd: "comment",
						path: itemUI.item.path
					});

					ef.menu.show(event.target, menu, { path: itemUI.item.path, attach: "point", point: { x: event.pageX, y: event.pageY }, pointAlign: "left" });
					event.preventDefault();
					event.stopPropagation();
					return false;
				}
			}
		}
		event.preventDefault();
	}
}

ef._onContextMenuSelect = function (menuItem) {
	if (menuItem.cmd == "comment") {
		ef.comments.comment({
			path: menuItem.path,
			point: ef.menu.options.point
		});
	}
}

ef.onPaste = function (event) {
	try {
		if (ef.isIE()) {
			if (event.target) {
				if (event.target.tagName === "INPUT") {
					var clipped = window.clipboardData.getData('Text');
					clipped = clipped.replace(/(\r\n|\n|\r)/gm, " "); //replace newlines with spaces
					$(event.target).val(clipped).change();
					return false; //cancel the pasting event
				}
			}
		}
	} catch (e) {
		console.log("Paste error. " + e);
	}
}

ef.onScroll = function () {

	//ef.setLookupsOffset();
	//console.log("onScroll");
}

ef.onDocumentScroll = function (event) {

	var isHideMenu = true;

	var uiElement = ef.getElement(event.target);
	if (uiElement != null) {
		var elementID = uiElement.getAttribute("data-element");
		if (elementID == "ef.menu") {
			isHideMenu = false;
		}
	}

	if (isHideMenu) {
		ef.menu.hide();
	}

	if (typeof (sf) != "undefined" && typeof (sf.comments) != "undefined" && typeof (sf.comments.onScroll) == "function") {
		sf.comments.onScroll(event);
	}
}

ef.onKeyDown = function (event) {

	if ((event.ctrlKey || event.metaKey) && event.keyCode === 70) {
		// Ctrl + F
		var $uiField = $("[data-part='search'] input:first");
		if ($uiField.length != 0) {
			if (!ef.isLocked($uiField)) {
				event.preventDefault();
				$uiField.focus()
				setTimeout(function () { $uiField.select(); }, 1);
			}
		}
	} else if ((event.ctrlKey || event.metaKey) && event.keyCode === 83) {
		// Ctrl + S
		event.preventDefault();
		var $uiButton = $("[data-button-preset='Save']");
		if ($uiButton.length != 0) {
			if (!ef.isLocked($uiButton)) {
				$uiButton.focus();
				setTimeout(function () { $uiButton.click(); }, 50);
			}
		}
		return false;
	} else if (event.keyCode == 27) {
		// ESC.
		if (ef.popups.length != 0) {
			var popup = ef.popups[ef.popups.length - 1];
			ef.closePopup(popup.$uiPopup[0]);
		}
	} else if ((event.ctrlKey || event.metaKey) && (event.keyCode == 65 || event.keyCode == 68 || event.keyCode == 69 || event.keyCode == 88)) {
		// Ctrl + A, Ctrl + D, Ctrl + E, Ctrl + X
		var uiCmd = event.target;
		if (uiCmd.tagName != "INPUT" && uiCmd.tagName != "TEXTAREA") {
			var path = ef.getPath(uiCmd);
			if (!path)
				path = ef.activeItem;
			if (!path)
				path = ef.$ui.find("[data-grid][data-path]").attr("data-path");
			if (path) {
				var itemUI = ef.findItemUI(path);
				if (itemUI != null && itemUI.$ui) {
					if (!ef.isLocked(itemUI.$ui)) {
						if (itemUI.parent.parent && itemUI.parent.parent.item && itemUI.parent.parent.item.type == "grid") {
							itemUI = itemUI.parent.parent;
						}
						if (itemUI.item.type == "grid") {
							var gridUI = itemUI.gridUI;
							gridUI.cmd(uiCmd, {
								cmd: "keyDown",
								event: event
							});
						}
					}
				}
			}
			event.preventDefault();
			return false;
		}
	} else if (event.keyCode == 112) {
		// F1.
		var url = null;
		if (ef.popups.length != 0) {
			var popup = ef.popups[ef.popups.length - 1];
			if (popup.context) {
				url = "/help/search/?context=" + encodeURIComponent(popup.context);
			}
		}
		if (!url) {
			for (var contextID in ef.pageModel.contexts) {
				url = "/help/search/?context=" + encodeURIComponent(contextID);
				break;
			}
		}
		if (!url) {
			url = "/help/";
		}
		window.open(url, "_blank");
	}

	var element = ef.getElement(event.target);

	if (typeof (ide) != "undefined" && typeof (ide.onEvent) == "function") {
		ide.onEvent({ event: event, element: element, eventName: "KeyDown", elementName: element != null ? element.getAttribute("data-element") : "" });
		if (event.isPropagationStopped()) {
			return event.isDefaultPrevented() ? false : null;
		}
	}

	if (typeof (gs) != "undefined" && typeof (gs.onKeyDown) == "function")
		return gs.onKeyDown(event);
}

ef.onKeyUp = function (event) {
	var element = ef.getElement(event.target);

	if (typeof (ide) != "undefined" && typeof (ide.onEvent) == "function") {
		ide.onEvent({ event: event, element: element, eventName: "KeyUp", elementName: element != null ? element.getAttribute("data-element") : "" });
	}
}

ef.onKeyPress = function (event) {

	if (event.which == 13) {
		// Enter.
		var isProcess = true;
		if (typeof (event.target.tagName) != "undefined" && event.target.tagName == "TEXTAREA") {
			isProcess = false;
		}
		if (isProcess) {
			if (event.target && typeof (event.target.getAttribute) == "function") {
				var $uiTarget = $(event.target);
				if (ef.isLocked($uiTarget)) {
					event.preventDefault();
					return false;
				}
				var $uiCmd = null;
				if ($uiTarget.attr("data-cmd")) {
					$uiCmd = $uiTarget;
				} else {
					var $uiDefaultButtonContainer = $uiTarget.parents("[data-default-button]:first");
					if ($uiDefaultButtonContainer.length != 0) {
						var $uiCmd = $uiDefaultButtonContainer.find("[data-button='" + $uiDefaultButtonContainer.attr("data-default-button") + "']");
						if ($uiCmd.length == 0) {
							$uiCmd = $uiDefaultButtonContainer.parents("[data-control='popup']:first").find("[data-button='" + $uiDefaultButtonContainer.attr("data-default-button") + "']");
							if ($uiCmd.length == 0)
								$uiCmd = $uiDefaultButtonContainer.parents("[data-context]:first").find("[data-button='" + $uiDefaultButtonContainer.attr("data-default-button") + "']");
						}

					}
				}
				if ($uiCmd && $uiCmd.length != 0) {
					setTimeout(function () { $uiCmd.click(); }, 100);
					event.preventDefault();
					return false;
				}
			}
		}
	}

	if (typeof (gs) != "undefined" && typeof (gs.onKeyPress) == "function")
		return gs.onKeyPress(event);
}

ef.onMouseDown = function (event) {

	ef.takePointerData(event);

	var element = ef.getElement(event.target);

	var isHideMenu = true;
	var isHideAutoFilter = true;
	var isHideAutoFilterOptions = true;
	var isCloseLookups = true;

	if (element != null) {
		var elementID = element.getAttribute("data-element");
		if (elementID == "ef.menu") {
			isHideMenu = false;
		} else if (elementID.indexOf("ef.autoFilterTab") === 0 || elementID == "ef.autoFilterCmd") {
			isHideAutoFilter = false;
		} else if (elementID.indexOf("ef.field.") === 0) {
			ef.field.onEvent({ event: event, element: element, eventName: "MouseDown", elementName: element != null ? element.getAttribute("data-element") : "" });
		}
		if (elementID.indexOf("ef.autoFilterTab.optionsTab") === 0 || elementID == "ef.autoFilterTab.optionsCmd") {
			isHideAutoFilterOptions = false;
		}

		if (ef.graphics && ef.graphics.active)
			ef.graphics.onEvent({ event: event, element: element, eventName: "MouseDown", elementName: element != null ? element.getAttribute("data-element") : "" });
	} else {
		if (ef.getElement(event.target, "id", "ui-datepicker-div") != null) {
			isHideAutoFilter = false;
		}
		if (event.target && ($(event.target).is(".lookup-popup") || $(event.target).parents(".lookup-popup:first").length != 0)) {
			isCloseLookups = false;
		}
	}

	if (isHideMenu) {
		ef.menu.hide();
	}

	if (isHideAutoFilter) {
		GridUI.closeAutoFilter();
	} else if (isHideAutoFilterOptions) {
		GridUI.closeAutoFilterOptions();
	}

	if (isCloseLookups)
		ef.closeLookups();

	if (event.isPropagationStopped()) {
		return;
	}
	if (typeof (ide) != "undefined" && typeof (ide.onEvent) == "function") {
		ide.onEvent({ event: event, element: element, eventName: "MouseDown", elementName: element != null ? element.getAttribute("data-element") : "" });
	}
	if (event.isPropagationStopped()) {
		return;
	}
	//if (typeof(ef.design) != "undefined" && typeof(ef.design.onMouseDown) == "function") {
	//	ef.design.onMouseDown(event);
	//}
	if (typeof (app) != "undefined" && typeof (app.onEvent) == "function") {
		app.onEvent({ event: event, element: element, eventName: "MouseDown", elementName: element != null ? element.getAttribute("data-element") : "" });
	}
}

ef.takePointerData = function (event) {

	if (!ef.pointerData)
		ef.pointerData = {};

	ef.pointerData.downPageX = event.pageX;
	ef.pointerData.downPageY = event.pageY;
}

ef.onMouseUp = function (event) {

	if (ef.popup.moving) {
		ef.overlay.unlock();
		ef.popup.moving = false;
	}

	if (ef.popup.resizing) {
		ef.overlay.unlock();
		ef.popup.resizing = false;
	}

	if (ef.adjusting) {
		ef.completeAdjusting(event);
	}

	if (ef.dragging) {
		ef.completeDragging(event);
	}

	if (ef.moving) {
		ef.completeMoving(event);
	}

	if (event.isPropagationStopped()) {
		return;
	}

	var element = ef.getElement(event.target);

	if (typeof (ide) != "undefined" && typeof (ide.onEvent) == "function") {
		ide.onEvent({ event: event, element: element, eventName: "MouseUp", elementName: element != null ? element.getAttribute("data-element") : "" });
	}
	if (event.isPropagationStopped()) {
		return;
	}
	//if (typeof(ef.design) != "undefined" && typeof(ef.design.onMouseUp) == "function") {
	//	ef.design.onMouseUp(event);
	//}
	if (typeof (app) != "undefined" && typeof (app.onEvent) == "function") {
		app.onEvent({ event: event, element: element, eventName: "MouseUp", elementName: element != null ? element.getAttribute("data-element") : "" });
	}
}

ef.isMouseMoveLocked = function () {
	return ef.popup.moving || ef.popup.resizing || ef.adjusting || ef.dragging || ef.moving;
}

ef.onMouseMove = function (event) {

	if (ef.popup.moving)
		ef.popup.move(event);

	if (ef.popup.resizing)
		ef.popup.resize(event);

	if (ef.adjusting)
		ef.adjust(event);

	if (ef.dragging)
		ef.drag(event);

	if (ef.moving)
		ef.move(event);

	//if (typeof(ef.design) != "undefined" && typeof(ef.design.onMouseMove) == "function")
	//	ef.design.onMouseMove(event);
}

ef.onMouseOver = function (event) {

	var element = ef.getElement(event.target);

	if (typeof (ide) != "undefined" && typeof (ide.onEvent) == "function") {
		ide.onEvent({ event: event, element: element, eventName: "MouseOver", elementName: element != null ? element.getAttribute("data-element") : "" });
	}
	//if (typeof(ef.design) != "undefined" && typeof(ef.design.onMouseOver) == "function") {
	//	ef.design.onMouseOver(event);
	//}

	if (event.isPropagationStopped())
		return;

	if (ef.tooltip.getVisible())
		ef.tooltip.onEvent({ event: event, element: element, eventName: "MouseOver", elementName: element != null ? element.getAttribute("data-element") : "" });

	if (event.isPropagationStopped())
		return;

	var itemUI = ef.getTargetItemUI(event.target);
	if (itemUI != null)
		itemUI.onEvent({ event: event, element: element, eventName: "MouseOver", elementName: element != null ? element.getAttribute("data-element") : "" });

	ef.forwardEvent(ef, ef._eventChildren, { event: event, element: element, eventName: "MouseOver", elementName: element != null ? element.getAttribute("data-element") : "" });
}

ef.onMouseOut = function (event) {

	var element = ef.getElement(event.target);

	if (typeof (ide) != "undefined" && typeof (ide.onEvent) == "function") {
		ide.onEvent({ event: event, element: element, eventName: "MouseOut", elementName: element != null ? element.getAttribute("data-element") : "" });
	}
	//if (typeof(ef.design) != "undefined" && typeof(ef.design.onMouseOut) == "function") {
	//	ef.design.onMouseOut(event);
	//}

	if (event.isPropagationStopped())
		return;

	if (ef.tooltip.getVisible())
		ef.tooltip.onEvent({ event: event, element: element, eventName: "MouseOut", elementName: element != null ? element.getAttribute("data-element") : "" });

	if (event.isPropagationStopped())
		return;

	var itemUI = ef.getTargetItemUI(event.target);
	if (itemUI != null)
		itemUI.onEvent({ event: event, element: element, eventName: "MouseOut", elementName: element != null ? element.getAttribute("data-element") : "" });

	ef.forwardEvent(ef, ef._eventChildren, { event: event, element: element, eventName: "MouseOut", elementName: element != null ? element.getAttribute("data-element") : "" });
}

ef.startAdjusting = function (event, options, data) {
	ef.adjusting = true;
	ef.adjustingData = data;
	ef.overlay.lock(options);
	ef.takePointerData(event);
}

ef.adjust = function (event) {
	if (ef.adjustingData.adjust && typeof (ef.adjustingData.adjust) == "function") {
		var data = {
			offsetX: event.pageX - ef.pointerData.downPageX,
			offsetY: event.pageY - ef.pointerData.downPageY
		}
		ef.adjustingData.adjust(event, data);
	} else if (ef.adjustingData.itemUI) {
		ef.adjustingData.itemUI.adjust(event);
	}
}

ef.completeAdjusting = function (event) {
	if (ef.adjustingData.complete && typeof (ef.adjustingData.complete) == "function") {
		ef.adjustingData.complete(event);
	} else if (ef.adjustingData.itemUI) {
		ef.adjustingData.itemUI.completeAdjusting(event);
	}
	ef.adjusting = false;
	delete ef.adjustingData;
	ef.overlay.unlock();
}

ef.startDragging = function (event, options, data) {
	ef.dragging = true;
	ef.draggingData = data;
	$("body").addClass("dragging");
	ef.takePointerData(event);
	if (data.helper) {
		var $uiHelper = $('<div class="drag-helper">')
			.html(data.helper)
			.appendTo("body");
	}
}

ef.drag = function (event) {
	$("body > .drag-helper").css({
		left: (event.pageX) + "px",
		top: (event.pageY) + "px"
	});
	if (ef.draggingData.drag && typeof (ef.draggingData.drag) == "function") {
		var data = {
			pageX: event.pageX,
			pageY: event.pageY
		}
		ef.draggingData.drag(event, data);
	} else if (ef.draggingData.itemUI) {
		ef.draggingData.itemUI.drag(event);
	}
}

ef.completeDragging = function (event) {
	if (ef.draggingData.complete && typeof (ef.draggingData.complete) == "function") {
		ef.draggingData.complete(event);
	} else if (ef.draggingData.itemUI) {
		ef.draggingData.itemUI.completeDragging(event);
	}
	ef.dragging = false;
	delete ef.draggingData;
	$("body").removeClass("dragging");
	$("body > .drag-helper").remove();
}

ef.startMoving = function (event, ui, options) {
	ef.moving = true;
	ef.movingData = {};
	if (options)
		ef.movingData.options = options;
	if (ui) {
		var offset = $(ui).offset();
		var parentOffset = options && options.offsetParent ? $(options.offsetParent).offset() : null;
		ef.movingData.ui = ui;
		ef.movingData.initialLeft = offset.left - (parentOffset != null ? parentOffset.left : 0);
		ef.movingData.initialTop = offset.top - (parentOffset != null ? parentOffset.top : 0);
	}
	if (!options || options.lock === undefined || options.lock) {
		ef.movingData.lock = true;
		ef.overlay.lock(options);
	}
}

ef.move = function (event) {

	var offsetX = event.pageX - ef.pointerData.downPageX;
	var offsetY = event.pageY - ef.pointerData.downPageY;
	if (ef.movingData.ui) {
		var left = ef.movingData.initialLeft + offsetX;
		var top = ef.movingData.initialTop + offsetY;
		if (left < 0) left = 0;
		if (top < 0) top = 0;

		var ui = ef.movingData.ui;
		ui.style.left = left + "px";
		ui.style.top = top + "px";
	}
	if (ef.movingData.options && typeof (ef.movingData.options.onMove) === "function")
		ef.movingData.options.onMove(ef.movingData.options, { offsetX: offsetX, offsetY: offsetY, event: event });
}

ef.completeMoving = function (event) {
	ef.moving = false;
	if (ef.movingData.lock)
		ef.overlay.unlock();
	var offsetX = event.pageX - ef.pointerData.downPageX;
	var offsetY = event.pageY - ef.pointerData.downPageY;
	var data = { offsetX: offsetX, offsetY: offsetY, event: event };
	var options = ef.movingData.options;
	delete ef.movingData;
	if (options && typeof (options.onComplete) === "function")
		options.onComplete(options, data);
}

ef._openLookups = [];

ef.closeLookups = function () {

	for (var index = 0; index < ef._openLookups.length; index++) {
		var lookup = ef._openLookups[index];
		lookup._lookupClose();
	}
}

ef.setLookupsOffset = function () {

	for (var index = 0; index < ef._openLookups.length; index++) {
		var lookup = ef._openLookups[index];
		lookup._setOffset();
	}
}

String.prototype.replaceAll = function (str1, str2, ignore) {
	return this.replace(new RegExp(str1.replace(/([\/\,\!\\\^\$\{\}\[\]\(\)\.\*\+\?\|\<\>\-\&])/g, "\\$&"), (ignore ? "gi" : "g")), (typeof (str2) == "string") ? str2.replace(/\$/g, "$$$$") : str2);
};

String.prototype.htmlEncode = function () {
	return this.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/'/g, '&#39;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
};

ef.htmlEncode = function (text) {
	return text.toString().htmlEncode();
}

ef.html2text = function (html) {
	return html.toString().replace(/<\/?[^>]+(>|$)/g, "");
}

ef.padLeft = function (o, n, str) {
	return Array(n - String(o).length + 1).join(str || '0') + o;
}

ef.isUnsavedChanges = function () {
	var isUnsavedChanges = false;
	for (var contextID in ef.pageModel.contexts) {
		var context = ef.pageModel.contexts[contextID];
		if ((typeof (context.changedFields) != "undefined" && context.changedFields.length != 0)
			|| (typeof (context.unsavedChanges) != "undefined" && context.unsavedChanges)) {
			isUnsavedChanges = true;
			break;
		}
	}
	return isUnsavedChanges;
}

ef.cacheImages = function (sources) {

	var uiBody = $("body")[0];

	var uiImages = [];

	for (var i = 0; i < sources.length; i++) {
		var uiImage = document.createElement("img");
		$(uiImage).bind("load", function () {
			$(this).remove();
		})
		uiImage.src = sources[i];
		//img.style.visibility = "hidden";
		uiImage.style.width = "10px";
		uiImage.style.height = "10px";
		uiImage.className = "img-cache";
		uiBody.appendChild(uiImage);
		uiImages.push(uiImage);
	}

	return uiImages;
}

ef.gallery = function (uiSourceImage) {

	var $uiSourceImage = $(uiSourceImage);
	var uiMedia = null;
	var uiMediaCursor = uiSourceImage;
	while (uiMediaCursor && uiMediaCursor.tagName != "BODY") {
		if (uiMediaCursor.getAttribute("data-part") == "media" || uiMediaCursor.getAttribute("data-control") == "gallery" || uiMediaCursor.getAttribute("data-part") == "files") {
			uiMedia = uiMediaCursor;
			break;
		}
		uiMediaCursor = uiMediaCursor.parentNode;
	}
	if (!uiMedia)
		uiMedia = uiSourceImage;
	var $uiMedia = $(uiMedia);
	var image = $uiSourceImage.attr("data-image") ? $uiSourceImage.attr("data-image") : $uiSourceImage.attr("src");

	var $uiPopup = $("#galleryPopup");
	if ($uiPopup.length == 0)
		$uiPopup = $("<div>")
			.attr("id", "galleryPopup")
			.addClass("gallery-popup")
			.appendTo("body");

	var html = [];
	html.push("<div data-part='content' class='content'>"); // Begin content.
	html.push("<div class='inner'>"); // Begin inner.
	html.push("<a data-cmd='close' class='cmd-close'><span></span></a>"); // cmd-close.
	html.push("<img src='' data-part='image' class='image' style='visibility: hidden;' />"); // image.
	html.push("<div class='back' data-part='back'></div>"); // back.
	html.push("<div class='details' data-part='details'><div data-field='count' class='count'></div><div class='extra-wrap'><div data-field='name' class='name'></div></div></div>"); // Details.
	html.push("</div>"); // End inner.
	html.push("</div>"); // End content.

	$uiPopup.html(html.join(""));

	var $uiImage = $uiPopup.find("[data-part='image']");
	var $uiDetails = $uiPopup.find("[data-part='details']");
	var $uiName = $uiDetails.find("[data-field='name']");

	if ($uiMedia.length != 0)
		$uiName.text($uiMedia.attr("data-title"));

	if ($uiMedia.attr("data-social-url")) {
		$uiPopup.attr("data-social-url", $uiMedia.attr("data-social-url"));
		var $uiSocialWidget = $($("[data-template='gallerySocialWidget']").html());
		$uiSocialWidget.insertAfter($uiPopup.find("[data-field='name']"));
		if (typeof (gs) != "undefined" && typeof (gs.social) == "function")
			gs.social.init($uiPopup);
	}

	var $uiAllImages = $uiMedia.find("[data-part='image']");

	var cacheNextImage = function () {
		if ($uiAllImages.length <= 1) return;
		var data = $uiImage.data("gallery");
		var imageIndex = data.$uiAllImages.index(data.$uiSourceImage);
		imageIndex = (imageIndex >= data.$uiAllImages.length - 1) ? 0 : imageIndex + 1;
		var $uiSourceImage = $($uiAllImages[imageIndex]);
		var image = $uiSourceImage.attr("data-image") ? $uiSourceImage.attr("data-image") : $uiSourceImage.attr("src");
		if (data.cached.indexOf(image) == -1) {
			ef.cacheImages([image]);
			data.cached.push(image);
		}
	};

	var imageNumber = $uiAllImages.index($uiSourceImage) + 1;
	$uiPopup.find("[data-field='count']").text(imageNumber + " / " + $uiAllImages.length);
	if ($uiAllImages.length > 1) {
		$uiImage.data("gallery", {
			$uiAllImages: $uiAllImages,
			$uiSourceImage: $uiSourceImage,
			cached: []
		});

		$uiImage.click(function (e) {
			showLoading();
			var data = $uiImage.data("gallery");
			var imageIndex = data.$uiAllImages.index(data.$uiSourceImage);
			imageIndex = (imageIndex >= data.$uiAllImages.length - 1) ? 0 : imageIndex + 1;
			data.$uiSourceImage = $($uiAllImages[imageIndex]);
			var image = data.$uiSourceImage.attr("data-image") ? data.$uiSourceImage.attr("data-image") : data.$uiSourceImage.attr("src");
			$uiImage.attr("src", image);
			$uiPopup.find("[data-field='count']").text((imageIndex + 1) + " / " + data.$uiAllImages.length);
			cacheNextImage();
			e.preventDefault();
			return false;
		});

		$uiPopup.find("[data-part='back']").click(function (e) {
			showLoading();
			var data = $uiImage.data("gallery");
			var imageIndex = data.$uiAllImages.index(data.$uiSourceImage);
			imageIndex = (imageIndex <= 0) ? data.$uiAllImages.length - 1 : imageIndex - 1;
			data.$uiSourceImage = $($uiAllImages[imageIndex]);
			var image = data.$uiSourceImage.attr("data-image") ? data.$uiSourceImage.attr("data-image") : data.$uiSourceImage.attr("src");
			$uiImage.attr("src", image);
			$uiPopup.find("[data-field='count']").text((imageIndex + 1) + " / " + data.$uiAllImages.length);
			e.preventDefault();
			return false;
		});
	}

	var fClose = function () {
		$uiPopup.html("").remove();
		ef.overlay.hide();
	};

	$uiPopup.find("[data-cmd='close']").click(fClose);

	ef.overlay.show({
		click: fClose
	});

	var gallerySize = ef.setGallery();

	$uiName.click(function (e) {
		var expand = !$uiDetails.data("gallery_expanded");
		if (expand) {
			//var scrollHeight = $uiName[0].scrollHeight;
			//$uiName.css("height", scrollHeight + "px");
			$uiDetails.addClass("max");
			$uiDetails.data("gallery_expanded", true);
		} else {
			$uiDetails.removeClass("max");
			$uiDetails.data("gallery_expanded", false);
		}
		e.preventDefault();
		return false;
	});

	$uiPopup.click(fClose).show();

	var sizeAttr = $uiSourceImage.attr("data-orig-size") || $uiSourceImage.attr("data-size");

	if (sizeAttr) {
		var imageSize = ($uiSourceImage.attr("data-orig-size") || $uiSourceImage.attr("data-size")).split("|");
		var imgOrigWidth = parseInt(imageSize[0]);
		var imgOrigHeight = parseInt(imageSize[1]);
		var imgWidth = Math.min(imgOrigWidth, gallerySize.maxWidth);
		var imgHeight = imgOrigHeight * imgWidth / imgOrigWidth;

		if (imgHeight > gallerySize.maxHeight) {
			imgHeight = Math.min(imgOrigHeight, gallerySize.maxHeight);
			imgWidth = imgOrigWidth * imgHeight / imgOrigHeight;
		};

		$uiImage.css({
			"width": imgWidth + "px",
			"height": imgHeight + "px"
		});
	}

	var showLoading = function () {
		var $uiLoading = $uiPopup.find("[data-part='loading']");
		if ($uiLoading.length != 0) return;
		$uiLoading = $("<div class='loading' data-part='loading'><div class='box'></div><div class='text'>loading</div></div>")
			.click(function (e) {
				e.preventDefault();
				return false;
			});
		$uiPopup.children("[data-part='content']").prepend($uiLoading);
		setTimeout(function () { $uiLoading.addClass("animation"); }, 10);
	};

	var hideLoading = function () {
		var $uiLoading = $uiPopup.find("[data-part='loading']");
		$uiLoading.remove();
	};

	showLoading();

	$uiImage.bind("load", function () {
		hideLoading();
		this.style.visibility = "visible";
		this.style.width = "";
		this.style.height = "";
	}).attr("src", image);

	cacheNextImage();
}

ef.setGallery = function () {

	var $uiPopup = $("#galleryPopup");
	if ($uiPopup.length == 0)
		return;

	var $uiImage = $uiPopup.find("[data-part='image']");

	var wndWidth = ef.$window.width();
	var wndHeight = ef.$window.height();

	$uiPopup.css({
		"left": ef.$document.scrollLeft() + "px",
		"top": ef.$document.scrollTop() + "px",
		"line-height": wndHeight + "px",
	});

	var data = {
		maxWidth: wndWidth,
		maxHeight: (wndHeight - $uiPopup.find("[data-cmd='close']").innerHeight() - $uiPopup.find("[data-part='details']").innerHeight())
	};

	$uiImage.css({
		"max-width": data.maxWidth + "px",
		"max-height": data.maxHeight + "px"
	});

	return data;
}

ef.tooltip = new function () { };
ef.tooltip._visible = false;

ef.tooltip.getVisible = function () {
	return ef.tooltip._visible;
}

ef.tooltip.cancelShow = function () {
	clearTimeout(ef.tooltip.timeout);
}

ef.tooltip.show = function (ui, tooltip, options) {

	if (ef.tooltip.timeout) {
		clearTimeout(ef.tooltip.timeout);
	}

	ef.tooltip._ui = ui;
	ef.tooltip._tooltip = tooltip;
	ef.tooltip._options = options;

	if (options && options.timeout)
		ef.tooltip.timeout = setTimeout(function () { ef.tooltip._show(ui, tooltip, options) }, options.timeout);
	else
		ef.tooltip._show(ui, tooltip, options);
}

ef.tooltip._show = function (ui, tooltip, options) {

	if (ef.tooltip.timeout) {
		clearTimeout(ef.tooltip.timeout);
	}

	var $ui = $(ui);

	if (typeof (ef.tooltip.$tooltipBalloon) == "undefined") {
		ef.tooltip.$tooltipBalloon = $("<div id='tooltipBalloon'>");
		ef.tooltip.$tooltipBalloon.html("<div class='callout'>&nbsp;</div><div class='body'><div class='content'></div></div>");
		$("body").append(ef.tooltip.$tooltipBalloon);
	}
	ef.tooltip.$tooltipBalloon[0].className = "tooltip-balloon " + (options && options.cssClass ? " " + options.cssClass : "");

	var html = [];
	if (tooltip.server)
		if (ef.tooltip._context && ef.tooltip._context.tag === tooltip.serverData.tag && ef.tooltip._context.html !== undefined) {
			html.push(ef.tooltip._context.html);
		} else {
			html.push("<div class='loading'></div>");
			if (!ef.tooltip._context || ef.tooltip._context.tag !== tooltip.serverData.tag) {
				ef.tooltip._context = {
					tag: tooltip.serverData.tag
				}
				ef.cmd("_tooltip:load", ui, { model: false, lock: false, data: { tooltip: JSON.stringify(tooltip.serverData, null, 0) } });
			}
		}
	else {
		if (options.head) {
			html.push("<div class='head'>" + ef.htmlEncode(options.head.text) + "</div>");
		}
		if (options.value) {
			html.push("<div class='value'>" + options.value.html + "</div>");
		}
		html.push(tooltip.html);
	}

	ef.tooltip.$tooltipBalloon.find(".content")
		.html(html.join(""));

	ef.tooltip.setOffset();
	ef.tooltip.$tooltipBalloon.css("visibility", "visible");
	ef.tooltip._visible = true;
}

ef.tooltip.setOffset = function () {
	var $uiCmd = $(ef.tooltip._ui);
	var tooltipOffset = $uiCmd.offset();
	var cmdOffset = $uiCmd.offset();
	var cmdHeight = $uiCmd.outerHeight(true);
	var cmdWidth = $uiCmd.outerWidth(true);
	//ef.tooltip.$tooltipBalloon.css("height", "auto");
	var tabWidth = ef.tooltip.$tooltipBalloon.outerWidth(true);
	var tabHeight = ef.tooltip.$tooltipBalloon.outerHeight(true);
	var windowHeight = ef.$window.height();
	var windowWidth = ef.$window.width();
	var documentScrollTop = ef.$document.scrollTop();
	var documentScrollLeft = ef.$document.scrollLeft();
	var left, top, isPosUp, isPosLeft, height;
	if (cmdOffset.top - documentScrollTop > windowHeight / 2 || ef.tooltip.$tooltipBalloon.outerHeight() < cmdOffset.top - documentScrollTop) {
		top = cmdOffset.top - tabHeight;
		isPosUp = true;
	} else {
		top = cmdOffset.top + cmdHeight;
		isPosUp = false;
	}
	//if (top < 0) {
	//	height = tabHeight - (documentScrollTop - top);
	//	top = 0;
	//} else
	//	height = "auto";
	ef.tooltip.$tooltipBalloon.css("top", top + "px");
	isPosUp ? ef.tooltip.$tooltipBalloon.addClass("pos-up") : ef.tooltip.$tooltipBalloon.removeClass("pos-up");
	///ef.tooltip.$tooltipBalloon.css("height", height === "auto" ? "auto" : height + "px");
	//ef.tooltip.$tooltipBalloon.find("> .body").css("height", height === "auto" ? "auto" : (height - (ef.tooltip.$tooltipBalloon.outerHeight() - ef.tooltip.$tooltipBalloon.height()))  + "px"); 

	var left = cmdOffset.left + cmdWidth / 2 - tabWidth / 2;
	if (left - documentScrollLeft + tabWidth > windowWidth) {
		left = documentScrollLeft + windowWidth - tabWidth - 5;
		isPosLeft = true;
	} else {
		isPosLeft = false;
	}
	if (left < 0)
		left = 0;
	ef.tooltip.$tooltipBalloon.css("left", left + "px");
	isPosLeft ? ef.tooltip.$tooltipBalloon.addClass("pos-left") : ef.tooltip.$tooltipBalloon.removeClass("pos-left");
	ef.tooltip.$tooltipBalloon.find("> .callout").css("left", (cmdOffset.left + cmdWidth / 2 - left) + "px");
}

ef.tooltip.onEvent = function (data) {
	if (data.eventName === "MouseOut") {
		if (!ef.isDescendant(data.event.fromElement || data.event.relatedTarget, ef.tooltip._ui)) {
			ef.tooltip.hide();
		}
	}
	/*
	if (options && options.isInteractive) {
		$ui.one("mouseleave.tooltip", ef.tooltip.hideWithDelay);
		ef.tooltip.$tooltipBalloon.one("mouseenter.tooltip", function() {
			if (ef.tooltip.timeout) {
				clearTimeout(ef.tooltip.timeout);
			}
			ef.tooltip.$tooltipBalloon.one("mouseleave.tooltip", ef.tooltip.hideWithDelay);
		});
		
	} else {
		$ui.one("mouseleave.tooltip", ef.tooltip.hide);
	}*/
}

ef.tooltip.hideWithDelay = function () {
	if (ef.tooltip.timeout) {
		clearTimeout(ef.tooltip.timeout);
	}
	ef.tooltip.timeout = setTimeout(ef.tooltip.hide, 300);
}

ef.tooltip.hide = function () {
	if (ef.tooltip.timeout) clearTimeout(ef.tooltip.timeout);
	if (typeof (ef.tooltip.$tooltipBalloon) != "undefined")
		ef.tooltip.$tooltipBalloon.css({
			"left": "0",
			"top": "0",
			"visibility": "hidden"
		});
	ef.tooltip._visible = false;
	delete ef.tooltip._ui;
	delete ef.tooltip._tooltip;
	delete ef.tooltip._options;
}

ef.tooltip.content = function (context) {
	if (!ef.tooltip._context || ef.tooltip._context.tag !== context.tag)
		return null;
	ef.tooltip._context = context;
	if (ef.tooltip._visible) {
		var $uiContent = ef.tooltip.$tooltipBalloon.find(".content");
		$uiContent.html(context.html);
		ef.tooltip.setOffset();
	}
}

ef.tooltip.inTooltip = function (data) {
	return ef.tooltip._visible && ef.isDescendant(data.target, ef.tooltip.$tooltipBalloon[0]);
}

ef.menu = new function () { };

ef.menu.show = function (uiCmd, menu, options) {

	if (ef.menu.timeout) clearTimeout(ef.menu.timeout);

	if (!options && menu.options)
		options = menu.options;

	if (options && options.timeout)
		ef.menu.timeout = setTimeout(function () { ef.menu._show(uiCmd, menu, options) }, options.timeout);
	else
		ef.menu._show(uiCmd, menu, options);
}

ef.menu._show = function (uiCmd, menu, options) {

	if (ef.menu.timeout) clearTimeout(ef.menu.timeout);

	var $uiCmd = $(uiCmd);

	var self = this;

	var isClose = ef.menu.$uiMenuTab != null && ef.menu.$uiMenuTab.data("uiCmd") == uiCmd && !(options && ef.menu.options.loading);

	if (ef.menu.$uiMenuTab != null) {
		ef.menu.$uiMenuTab.remove();
		delete ef.menu.$uiMenuTab;
	}

	if (isClose) return;

	ef.menu.$uiMenuTab = $("<div id='menuTab' data-element='ef.menu'>")
		.addClass("menu-popup menu-tab")
		.appendTo("body")
		.data("uiCmd", uiCmd);

	ef.menu.menu = menu;
	ef.menu.options = options;
	var html = [];
	html.push("<div class='items'>");

	if (options && options.loading) {
		html.push("<div class='loading'></div>");
	} else {
		var items = menu.items;
		if (items.length != 0) {
			var itemIndex = 0;
			for (var i = 0; i < items.length; i++) {
				var item = items[i];
				if (item.type && item.type == "sep") {
					html.push("<div class='sep'></div>");
				} else {
					var disabled = false;
					if (item.disabled) {
						disabled = true;
					} else if (!item.multiple && item.selectedItems != null && item.selectedItems.length > 1) {
						disabled = true;
					} else if (item.selectedItems != null && menu.selectedItems != null && item.selectedItems.length != menu.selectedItems.length) {
						disabled = true;
					}
					html.push("<div class='item" + (itemIndex % 2 == 1 ? " alt" : "") + (disabled ? " disabled" : "") + "' data-menu-item='" + i + "'>");
					html.push("<label class='details'>");
					html.push("<span class='image-col'><span class='image" + (item.image ? " image-" + item.image : "") + "'></span></span>");
					html.push("<span class='name'>");
					html.push(ef.htmlEncode(item.name));
					html.push("</span>");
					if (item.desc) {
						html.push("<span class='desc'>");
						html.push(ef.htmlEncode(item.desc));
						html.push("</span>");
					}
					html.push("</label>");
					if (item.ide) {
						html.push("<span class='cmd-ide' data-cmd='_ide:properties' data-ide='" + ef.htmlEncode(item.ide) + "'><span></span></span>");
					}
					html.push("</div>");
					++itemIndex;
				}
			}
		} else {
			html.push("<div class='noitems'>" + ef.resource("Menu.NoItems.Text") + "</div>");
		}
	}

	html.push("</div>");
	ef.menu.$uiMenuTab.html(html.join(""))
	ef.initCommon(ef.menu.$uiMenuTab);

	ef.menu.$uiScrollParent = $uiCmd.parents();
	ef.menu.$uiScrollParent.one("scroll.menu", ef.menu.hide);

	var left;
	var top;
	var cmdOffset = options && options.attach == "point" ? { left: options.point.x, top: options.point.y } : $uiCmd.offset();
	var cmdHeight = options && options.attach == "point" ? 0 : $uiCmd.outerHeight(true);
	var cmdWidth = options && options.attach == "point" ? 0 : $uiCmd.outerWidth(true);
	var align = options && options.pointAlign ? options.pointAlign : options && options.cmdAlign ? options.cmdAlign : "";
	var tabWidth = ef.menu.$uiMenuTab.outerWidth(true);
	var tabHeight = ef.menu.$uiMenuTab.outerHeight(true);
	var documentScrollTop = ef.$document.scrollTop();
	var documentScrollLeft = ef.$document.scrollLeft();
	var windowHeight = $(window).height();
	var windowWidth = $(window).width();
	left = cmdOffset.left;
	if (align === "right")
		left += cmdWidth - tabWidth;
	if (left - documentScrollLeft + tabWidth > windowWidth)
		left = documentScrollLeft + windowWidth - tabWidth - 5;
	if (left < 0)
		left = 0;

	top = cmdOffset.top + cmdHeight;
	if (top - documentScrollTop + tabHeight > windowHeight) {
		if (cmdOffset.top - tabHeight >= documentScrollTop)
			top = cmdOffset.top - tabHeight;
		else
			top = documentScrollTop + windowHeight - tabHeight - 5;
	}
	if (top < 0)
		top = 0;
	ef.menu.$uiMenuTab.css({
		left: left + "px",
		top: top + "px"
	});
}

ef.menu.onClick = function (event) {
	if (ef.getElement(event.target, "data-ide") != null) {
		return;
	}
	var options = ef.menu.options;
	if (!(options && options.loading)) {
		var uiItem = ef.getElement(event.target, "data-menu-item", null, ef.menu.$uiMenuTab[0]);
		if (uiItem != null) {
			var $uiItem = $(uiItem);
			ef.menu.onItemEvent($uiItem, event, ef.menu.menu, options);
		}
	}
}

ef.menu.onItemEvent = function ($uiItem, event, menu, options, uiCmd) {
	if (!$uiItem.is(".disabled")) {
		var itemIndex = parseInt($uiItem.attr("data-menu-item"));
		var item = menu.items[itemIndex];
		var uiCmd = uiCmd || ef.menu.$uiMenuTab.data("uiCmd");
		ef.confirm(item.confirm,
			function () {
				var data = { menu: menu.id, tag: item.tag };
				if (options && options.cmdData) {
					data = $.extend(data, options.cmdData);
				}
				if (typeof (menu.select) == "function") {
					menu.select(item);
				} else if (item.cmd != null) {
					var cmd = item.cmd;
					if (cmd.indexOf("c:") == 0) {
						// Client cmd.
						cmd = $.trim(cmd.substring(2));
						if (cmd.indexOf("{") == 0) {
							var clientCmd = $.parseJSON(cmd);
							ef.clientCmd(this, clientCmd);
						} else {
							try {
								$.globalEval(cmd)
							} catch (e) {
								console.log("cmd failed. " + e);
							}
						}
					} else {
						setTimeout(function () { ef.cmd(item.cmd, uiCmd, { path: options.path, data: data, unsavedChangesRequest: item.unsavedChangesRequest }); }, 10);
					}
				} else if (item.download != null) {
					ef.download(item.download);
				} else if (item.url != null) {
					if (item.target)
						window.open(item.url, item.target);
					else
						location.href = item.url;
				} else {
					setTimeout(function () { ef.cmd(options && options.cmd ? options.cmd : "_menu:action", uiCmd, { path: options.path, data: data, unsavedChangesRequest: item.unsavedChangesRequest }); }, 10);
				}
				ef.menu.hide();
			}
		)
		ef.menu.hide();
		event.preventDefault();
		return false;
	}
}

ef.menu.hide = function () {
	if (ef.menu.timeout) clearTimeout(ef.menu.timeout);
	if (typeof (ef.menu.$uiMenuTab) != "undefined") {
		ef.menu.$uiMenuTab.remove();
		delete ef.menu.$uiMenuTab;
		ef.menu.$uiScrollParent.off("scroll.menu");
	}
}

ef.menu.isOpen = function () {
	return typeof (ef.menu.$uiMenuTab) != "undefined";
}

ef.download = function (downloadUrl) {

	var wnd;

	try {
		wnd = window.open(downloadUrl, '_blank');
	} catch (e) {
		wnd = null;
	}

	if (ef.isPopupBlocked(wnd)) {
		var html = [];
		html.push('<div data-part="popup:head" class="popup-head">' + ef.resource("FileDownload.Title") + '</div>');
		html.push('<div data-part="popup:content" class="popup-content form" data-default-button="Close"><p>' + ef.resource("FileDownload.Message.Text") + ' <a onclick=\'ef.clientCmd(this, {"type":"popup",cmd:"close"})\' href="' + downloadUrl + '">' + ef.resource("FileDownload.Link.Text") + '<a>.</p></div>');
		html.push('<div data-part="popup:buttons" class="popup-buttons"><a data-button="Close" class="button" data-cmd=\'c:{"type":"back"}\'><span class="text">' + ef.resource("Close.Text") + '</span></a></div>');

		var popup = ef.popup({
			view: html.join(""),
			width: 300,
			height: 250
		});
		ef.initCommon(popup.$uiPopup);
	}
}

ef.isPopupBlocked = function (wnd) {
	var result = false;

	try {
		if (typeof wnd == 'undefined') {
			// Safari with popup blocker... leaves the popup window handle undefined
			result = true;
		}
		else if (wnd == null) {
			result = true;
		}
		else if (wnd && wnd.closed) {
			// This happens if the user opens and closes the client window...
			// Confusing because the handle is still available, but it's in a "closed" state.
			// We're not saying that the window is not being blocked, we're just saying
			// that the window has been closed before the test could be run.
			result = false;
		}
		/*else if (wnd && wnd.test) {
			// This is the actual test. The client window should be fine.
			result = false;
		}*/
		else {
			result = false;
		}

	} catch (err) {
		//if (console) {
		//    console.warn("Could not access popup window", err);
		//}
	}

	return result;
}

/* Cookie */
ef.deleteCookie = function (name, path, domain) {
	if (ef.getCookie(name)) {
		document.cookie = name + "=" +
			((path) ? "; path=" + path : "; path=/") +
			((domain) ? "; domain=" + domain : "") +
			"; expires=Thu, 01-Jan-70 00:00:01 GMT";
	}
}

ef.getCookie = function (name) {
	var prefix = name + "=";
	var cookieStartIndex = document.cookie.indexOf(prefix);
	if (cookieStartIndex == -1)
		return null;
	var cookieEndIndex = document.cookie.indexOf(";", cookieStartIndex + prefix.length);
	if (cookieEndIndex == -1)
		cookieEndIndex = document.cookie.length;
	return unescape(document.cookie.substring(cookieStartIndex + prefix.length, cookieEndIndex));
}

ef.setCookie = function (name, value, expires, path, domain, secure) {
	var expDate = new Date(Date.parse(new Date()) + expires * 1000);
	var curCookie = name + "=" + escape(value) +
		((expires) ? "; expires=" + expDate.toUTCString() : "") +
		((path) ? "; path=" + path : "; path=/") +
		((domain) ? "; domain=" + domain : "") +
		((secure) ? "; secure" : "");
	if ((name + "=" + escape(value)).length <= 4000)
		document.cookie = curCookie;
	else
		if (confirm("Cookie 4kb limit failed!"))
			document.cookie = curCookie;
}

ef.device = function () {
	var device = null;
	try {
		var device = {
			viewport: {
				width: ef.$window.width(),
				height: ef.$window.height()
			}
		}
		ef.setCookie("device", JSON.stringify(device, null, 0), 3000000);
	} catch (ex) {
	}
	return device;
}

ef.updateSession = function () {

	if (typeof (ef._sessionTimeout) != "undefined")
		clearTimeout(ef._sessionTimeout);

	if (ef.auth && ef.auth.status == 1)
		ef._sessionTimeout = setTimeout(function () { ef.changeSessionState("ending"); }, 1800000);
}

ef.changeSessionState = function (state) {

	if (typeof (ef._sessionTimeout) != "undefined")
		clearTimeout(ef._sessionTimeout);

	if (state == "ending") {

		var html = [];
		html.push('<div data-part="popup:head" class="popup-head">Session time-out</div>');
		html.push('<div data-part="popup:content" class="popup-content form" data-default-button="Continue"><p>Session will be closed in 1 minute.</p></div>');
		html.push('<div data-part="popup:buttons" class="popup-buttons"><a data-button="Continue" class="button" data-cmd=\'c:{"type":"back"}\'><span class="text">Continue work</span></a></div>');

		var popup = ef.popup({
			view: html.join(""),
			width: 300,
			height: 250
		});
		ef.initCommon(popup.$uiPopup);

		ef._sessionTimeout = setTimeout(function () { ef.changeSessionState("end"); }, 60000);

	} else if (state == "end") {

		location.href = "/signout";
	}
}

ef.resource = function (key, defaultValue) {
	if (ef.resources && ef.resources[key] != null)
		return ef.resources[key]
	else
		return defaultValue;
}

ef.saveState = function () {

	var data = {
		cmd: "_state:save",
		pageModel: JSON.stringify(ef.pageModel, null, 0)
	}

	var url = location.href;

	ef.device();

	$.ajax({
		url: url,
		type: "POST",
		dataType: "json",
		cache: false,
		data: data,
		success: function (response) {
		},
		error: function (jqXHR, textStatus, errorThrown) {
			console.log("State saving failed. " + textStatus);
		}
	});
}

ef.savePreferences = function (options) {

	ef.cmd("_preferences:save", null, options);
	/*var data = {
		cmd: "_preferences:save",
		pageModel: JSON.stringify(ef.pageModel, null, 0)
	}

	var url = location.href;
	
	ef.device();
	
	$.ajax({
		url: url,
		type: "POST",
		dataType: "json",
		cache: false,
		data: data,
		success: function(response) {
		},
		error: function(jqXHR, textStatus, errorThrown) {
			console.log("Preferences saving failed. " + textStatus);
		}
	});*/
}

ef.dump = function (dump, options) {

	var html = [];
	html.push('<div data-part="popup:head" class="popup-head">' + (options && options.title ? ef.htmlEncode(options.title) : "Dump") + '</div>');
	html.push('<div data-part="popup:content" class="popup-content form" data-default-button="Close"><textarea class="dev-dump">' + ef.htmlEncode(dump) + '</textarea></div>');
	html.push('<div data-part="popup:buttons" class="popup-buttons">');
	html.push('<a data-button="Close" class="button" data-cmd=\'c:{"type":"back"}\'><span class="text">' + ef.resource("Close.Text") + '</span></a>');
	html.push('<a class="button" data-cmd=\'_preferences:resetAll\'><span class="text">' + ef.resource("UserPrefs.ResetAll.Text") + '</span></a>');
	html.push('</div>');

	var popup = ef.popup({
		view: html.join(""),
		width: "90%",
		height: "90%"
	});
	ef.initCommon(popup.$uiPopup);
}

ef.unsavedChangesRequest = function () {

	var html = [];
	html.push('<div data-part="popup:head" class="popup-head">' + ef.htmlEncode(ef.resource("UnsavedChangesRequest.Header.Text")) + '</div>');
	html.push('<div data-part="popup:content" class="popup-content form" data-default-button="Cancel">' + ef.htmlEncode(ef.resource("UnsavedChangesRequest.Content.Html")) + '</div>');
	html.push('<div data-part="popup:buttons" class="popup-buttons">');
	html.push('<a class="button" data-cmd=\'c:{"type":"unsavedChangesRequest","cmd":"save"}\'><span class="text">' + ef.htmlEncode(ef.resource("UnsavedChangesRequest.Save.Text")) + '</span></a>');
	/*html.push('<a class="button link" data-cmd=\'c:{"type":"unsavedChangesRequest","cmd":"continueWithoutSaving"}\'><span class="text">' + ef.htmlEncode(ef.resource("UnsavedChangesRequest.ContinueWithoutSaving.Text")) + '</span></a>');*/
	html.push('<a data-button="Cancel" class="button link" data-cmd=\'c:{"type":"unsavedChangesRequest","cmd":"cancel"}\'><span class="text">' + ef.htmlEncode(ef.resource("Cancel.Text")) + '</span></a>');
	html.push('</div>');

	var popup = ef.popup({
		view: html.join(""),
		width: "500",
		height: "150"
	});
	ef.initCommon(popup.$uiPopup);
}

ef.confirm = function (msg, okCallback, cancelCallback) {
	if (!msg) {
		okCallback();
		return;
	}
	ef.confirm.callbacks = {
		"ok": okCallback,
		"cancel": cancelCallback
	}
	var html = [];
	html.push('<div data-part="popup:head" class="popup-head">' + ef.htmlEncode(ef.resource("Message.Text")) + '</div>');
	html.push('<div data-part="popup:content" class="popup-content form" data-default-button="Cancel">' + ef.htmlEncode(msg).replace(/\n/g, "<br/>") + '</div>');
	html.push('<div data-part="popup:buttons" class="popup-buttons">');
	html.push('<a class="button" data-cmd=\'c:{"type":"confirm","cmd":"ok"}\'><span class="text">' + ef.htmlEncode(ef.resource("OK.Text")) + '</span></a>');
	html.push('<a data-button="Cancel" class="button link" data-cmd=\'c:{"type":"confirm","cmd":"cancel"}\'><span class="text">' + ef.htmlEncode(ef.resource("Cancel.Text")) + '</span></a>');
	html.push('</div>');

	var popup = ef.popup({
		view: html.join(""),
		width: "500",
		height: "200",
		cssClass: "confirm"
	});
	ef.initCommon(popup.$uiPopup);
}

ef.printer = new function () { };

ef.printer.endpoint = "//localhost:4401/";

ef.printer.print = function (url, options) {

	if (options && options.printer && options.printer === "Emulator") {
		ef.printer.emulate(url, options);
		return;
	}

	var data = {
		action: "print",
		url: url,
		nocache: Math.random()
	}

	if (options && options.printer) {
		data.printer = options.printer;
	}

	$.ajax({
		url: ef.printer.endpoint + "?nocache=" + Math.random(),
		type: "GET",
		dataType: "jsonp",
		data: data,
		success: function (data) {
			if (data.status != "ok")
				alert("An error occurred. " + data.description);
		},
		error: function (jqXHR, textStatus, errorThrown) {
			alert("An error occurred. " + textStatus);
		}
	});
}

ef.printer.emulate = function (url, options) {
	var $uiPrintingContent = $(".printer-emulator .printing-content");
	if ($uiPrintingContent.length === 0) {
		ef.download(url);
	} else {
		$uiPrintingContent.find(".printing-strip").remove();
		var $uiStrip = $("<div class='printing-strip'>").appendTo($uiPrintingContent);
		var $uiPage = $("<div class='printing-page'>").appendTo($uiStrip);
		var $uiImage = $("<img />").appendTo($uiPage);
		$uiImage[0].src = url;
		$uiImage.bind("load", function () {
			$uiStrip.addClass("ready");
			try {
				var objAudio = new Audio("/media/sounds/print.mp3");
				objAudio.play();
			} catch (ex) {
				console.log(ex);
			}
		}).on("click.gallery", function () {
			ef.gallery(this);
			$uiPrintingContent.find(".printing-strip").hide();
		});
	}
}

ef.applyClass = function (applyClass, ui) {

	var classPrefix = applyClass.substring(0, applyClass.indexOf("-") + 1);
	var classNames = $.trim(ui.className).replace(/\s+/g, " ").split(" ");
	if (classPrefix) {
		var i = 0;
		while (i < classNames.length) {
			var className = classNames[i];
			if (className.indexOf(classPrefix) == 0) {
				classNames.remove(i);
			} else {
				++i;
			}
		}
	}
	if (classPrefix != applyClass) {
		if (classNames.indexOf(applyClass) == -1) {
			classNames.push(applyClass);
		}
	}
	ui.className = classNames.join(" ");
}

ef.findClass = function (classPrefix, ui) {
	var result = null;
	var classNames = $.trim(ui.className).replace(/\s+/g, " ").split(" ");
	if (classPrefix) {
		for (var i = 0; i < classNames.length; i++) {
			var className = classNames[i];
			if (className.indexOf(classPrefix) == 0) {
				result = className;
				break;
			}
		}
	}
	return result;
}

ef.getTargetItemUI = function (target) {

	var cursor = target;
	while (cursor != null && cursor != document && cursor.tagName != "BODY" && cursor.getAttribute("data-context") == null) {
		var path = cursor.getAttribute("data-path");
		if (!path) {
			var part = cursor.getAttribute("data-part");
			if (part == "field") {
				path = $(cursor).find("[data-field]").attr("data-path");
			}
		}
		if (path) {
			var itemUI = ef.findItemUI(path);
			return itemUI;
		}
		cursor = cursor.parentNode;
	}
	return null;
}

/* Comments */
ef.comments = new function () { };

ef.comments.comment = function (options) {
	ef.comments.options = options;
	ef.comments.show(options);
}

ef.comments.show = function (options) {

	setTimeout(function () { ef.cmd("_comments:comment", null, { path: ef.comments.options.path }); }, 10);

	/*
	var html = [];
	html.push('<div data-part="popup:head" class="popup-head">' + (options && options.title? ef.htmlEncode(options.title): ef.htmlEncode(ef.resource("Comment.Text"))) + '</div>');
	html.push('<div data-part="popup:content" class="popup-content form" data-default-button="Submit">');
	html.push('<div class="field edit textarea" data-part="field" data-field="comment"><span class="field-value"><textarea class="edit" tabindex="1"></textarea></span></div>');
	html.push('<div class="field check" data-part="field" data-field="comment"><label class="field-label"><span>Office use only</span>:</label><span class="field-value"><label class="check"></label></span></div>');
	html.push('</div>');
	html.push('<div data-part="popup:buttons" class="popup-buttons"><a data-button="Submit" class="button" data-cmd=\'c:{"type":"comments","cmd":"submit"}\'><span class="text">' + ef.resource("Submit.Text") + '</span></a><a data-button="Cancel" class="button" data-cmd=\'c:{"type":"back"}\'><span class="text">' + ef.resource("Cancel.Text") + '</span></a></div>');
	
	var popup = ef.popup({
		view: html.join(""),
		width: options && options.width? options.width: "300",
		height: options && options.height? options.height: "220",
		cssClass: "comment-popup"
	});
	ef.initCommon(popup.$uiPopup);
	*/

	/*if (typeof (ef.comments.$commentsBalloon) == "undefined") {
		ef.comments.$commentsBalloon = $("<div id='commentsBalloon' class='comments-balloon" + (options && options.cssClass? " " + options.cssClass: "") + "'>");
		ef.comments.$commentsBalloon.html("<div class='body'><div class='content'></div></div>");
		$("body").append(ef.comments.$commentsBalloon);
	}
	
	var html = [];
	html.push("some content");
	
	ef.comments.$commentsBalloon.find(".content")
		.html(html.join(""));

	var pointOffset = {
		left: options.point.x,
		top: options.point.y
	}
	var wndWidth = ef.$window.width();
	var wndHeight = ef.$window.height();
	var documentScrollTop = ef.$document.scrollTop();
	var documentScrollLeft = ef.$document.scrollLeft();
	var left = pointOffset.left - ef.comments.$commentsBalloon.outerWidth() / 2;
	var top = pointOffset.top - ef.comments.$commentsBalloon.outerHeight();
	
	if (left + ef.comments.$commentsBalloon.outerWidth() > wndWidth) {
		left -= left + ef.comments.$commentsBalloon.outerWidth() - wndWidth - 15;
	}
	if (left <= 0) {
		left = 0;
	}
	if (top + ef.comments.$commentsBalloon.outerHeight() > wndHeight) {
		top -= top + ef.comments.$commentsBalloon.outerHeight() - wndHeight - 15;
	}
	if (top <= 0) {
		top = 0;
	}
	ef.comments.$commentsBalloon.css({
		left: left + "px",
		top: top + "px"
	});
		
	ef.comments.$commentsBalloon.css("visibility", "visible");
	*/
}

ef.comments.cmd = function (data) {
	if (data.cmd == "submit") {
		var $uiField = $(".comment-popup textarea");
		var $uiContainer = $uiField.parents("[data-part='field']:first");
		var value = $.trim($uiField.val());
		if (!value) {
			$uiContainer.addClass("mark-invalid");
			return;
		}
		var comment = {
			content: value
		}
		setTimeout(function () { ef.cmd("_comments:submit", null, { path: ef.comments.options.path, data: { comment: JSON.stringify(comment, null, 0) } }); }, 10);
	} else if (data.cmd == "close") {
		var $uiItemNotes = ef.$ui.find(".sf-comments-itemNotes.open");
		if ($uiItemNotes.length != 0) {
			if ($uiItemNotes.hasClass("sf-popup")) {
				$uiItemNotes.remove();
				ef.overlay.hide();
			} else {
				$uiItemNotes.removeClass("open");
			}
		}
	}
}
/*
ef.tooltip.hide = function() {
	if (ef.tooltip.timeout) clearTimeout(ef.tooltip.timeout);
	if (typeof (ef.tooltip.$tooltipBalloon) != "undefined")
		ef.tooltip.$tooltipBalloon.css({
			"left": "0",
			"top": "0",
			"visibility": "hidden"
		});
}
*/
ef.helpContent = new function () { };

ef.helpContent.ckeditor = null;

ef.helpContent.cmd = function (op) {
	if (op.cmd == "createlink") {
		var linkType = op.linkType;
		var linkTypeText = (linkType == 1) ? 'tooltip' : 'popup';
		var selectedContentID = op.selectedContentID;

		var selected_text = ef.helpContent.ckeditor.getSelection().getSelectedText(); // Get Text
		var newElement = new CKEDITOR.dom.element("a");
		newElement.setAttribute('href', '#' + linkTypeText + ':' + selectedContentID);
		newElement.setAttribute('data-help', '1');
		newElement.setText(selected_text);                           // Set text to element
		ef.helpContent.ckeditor.insertElement(newElement);

	}
}

ef.cssEditor = new function () { };

ef.cssEditor.ckeditor = null;

ef.cssEditor.cmd = function (op) {
	if (op.cmd == "setFormSkins") {
		var uiSkin = op.uiSkin;
		var formSkin = op.formSkin;
		if ($('#formSkin').length == 0) {
			$("<link id='formSkin' rel='stylesheet' href='/css/skins/FORMSKIN/" + formSkin + "'>").appendTo("head");
		} else {
			$('#formSkin').attr('href', "/css/skins/FORMSKIN/" + formSkin);
		}
		if ($('#uiSkin').length == 0) {
			$("<link id='uiSkin' rel='stylesheet' href='/css/skins/UISKIN/" + uiSkin + "'>").appendTo("head");
		} else {
			$('#uiSkin').attr('href', "/css/skins/UISKIN/" + uiSkin);
		}
	}
}

ef.getElement = function (element, attrName, attrValue, parent) {
	var uiElement = null;
	var cursor = element;
	while (cursor != null && cursor != document && cursor.tagName != "BODY") {
		if (parent && cursor == parent.parentNode) {
			break;
		}
		if (typeof (cursor.getAttribute) == "function") {
			var isMatch = false;
			if (attrName != null) {
				if (attrValue === null || attrValue === undefined) {
					if (cursor.hasAttribute(attrName)) {
						isMatch = true;
					}
				} else {
					if (cursor.getAttribute(attrName) === attrValue) {
						isMatch = true;
					}
				}
			} else if (cursor.getAttribute("data-element") != null) {
				isMatch = true;
			}
			if (isMatch) {
				uiElement = cursor;
				break;
			}
		}
		cursor = cursor.parentNode;
	}
	return uiElement;
}

ef.getControlGroup = function (contextID, controlGroup) {
	var context = ef.pageModel.contexts[contextID];
	var items = [];
	ef.getControlGroupRecursive(context, controlGroup, items);
	return items;
}

ef.getControlGroupRecursive = function (parentItem, controlGroup, items) {
	if (parentItem.items != null && parentItem.items.length != 0) {
		for (var itemIndex = 0; itemIndex < parentItem.items.length; itemIndex++) {
			var childItem = parentItem.items[itemIndex];
			if (typeof (childItem.controlGroup) != "undefined" && childItem.controlGroup === controlGroup) {
				items.push(childItem);
			}
			item = ef.getControlGroupRecursive(childItem, controlGroup, items);
		}
	}
}

ef.formatBinaryLength = function (value) {
	if (!value)
		return "0";
	else if (value < 1024)
		return value + " B";
	else if (value < 1048576)
		return Math.round(value / 1024 * 100) / 100 + " KB";
	else if (value < 1073741824)
		return Math.round(value / 1024 / 1024 * 100) / 100 + " MB";
	else if (value < 1099511627776)
		return Math.round(value / 1024 / 1024 / 1024 * 100) / 100 + " GB";
	else
		return Math.round(value / 1024 / 1024 / 1024 / 1024 * 100) / 100 + " TB";
}

ef.formatting = new function () { };
ef.formatting._$tools = null;

ef.formatting.findTools = function () {
	if (ef.formatting._$tools == null
		|| (ef.formatting._$tools.length != 0 && !$.contains(document.documentElement, ef.formatting._$tools[0]))) {
		ef.formatting._$tools = $(".workspace-tools-pane .field.formatting:first .formatting-pane");
	}
	return ef.formatting._$tools.length != 0;
}

ef.formatting.setTarget = function (targetElement, path) {
	if (!ef.formatting.findTools()) {
		return;
	}
	if (targetElement) {
		ef.formatting._$tools.attr("data-formatting-target", path);
		ef.field.formatting.initTarget(ef.formatting._$tools, targetElement);
	} else {
		ef.formatting._$tools.attr("data-formatting-target", "");
		ef.field.formatting.initTarget(ef.formatting._$tools, null);
	}
}

ef.getQueryParam = function (name) {
	var params = window.location.search.substr(1).split("&");
	for (var i = 0; i < params.length; i++) {
		var singleParam = params[i].split("=");
		if (singleParam[0] === name) {
			return decodeURIComponent(singleParam[1]);
		}
	}
}

ef.nav = new function () { };

ef.nav.onEvent = function (data) {
	if (data.eventName === "Click") {
		if (data.elementName === "ws.nav.item.head") {
			if (data.element.getAttribute("data-nav-entities")) {
				var $uiEntities = $(data.element).parent(".item:first").find(".entities");
				if ($uiEntities.is(":hidden")) {
					$uiEntities.slideDown();
				} else {
					$uiEntities.slideUp();
				}
				data.event.preventDefault();
				data.event.stopPropagation();
			}
		}
	}
}

ef.sound = function (item) {
	try {
		var objAudio = new Audio("/media/sounds/" + item.sound + ".mp3");
		objAudio.play();
	} catch (ex) {
		console.log(ex);
	}
}

ef.isIE = function detectIE() {
	var ua = window.navigator.userAgent;

	var msie = ua.indexOf('MSIE ');
	if (msie > 0) {
		// IE 10 or older => return version number
		return parseInt(ua.substring(msie + 5, ua.indexOf('.', msie)), 10);
	}

	var trident = ua.indexOf('Trident/');
	if (trident > 0) {
		// IE 11 => return version number
		var rv = ua.indexOf('rv:');
		return parseInt(ua.substring(rv + 3, ua.indexOf('.', rv)), 10);
	}

	var edge = ua.indexOf('Edge/');
	if (edge > 0) {
		// Edge (IE 12+) => return version number
		return parseInt(ua.substring(edge + 5, ua.indexOf('.', edge)), 10);
	}

	// other browser
	return false;
}

ef.inIframe = function () {
	try {
		return window.self !== window.top;
	} catch (e) {
		return true;
	}
}

ef.initInIframe = function () {
	try {
		ef.isInFrame = true;
		//console.log("initInIframe");
		window.addEventListener ? window.addEventListener("message", ef.onMessage) :
			window.attachEvent("onmessage", ef.onMessage);
		ef._iframeCode = new Date().getTime() + (Math.random() + "").substring(2);
		ef._iframeSenderID = ef.getQueryParam("SenderId");
		var data = {
			tag: "ef/initInIframe",
			code: ef._iframeCode,
			senderID: ef._iframeSenderID
		}
		parent.postMessage(JSON.stringify(data, null, 0), "*")

	} catch (ex) {
		console.log(ex);
	}
}

ef.onMessage = function (e) {
	if (e.data && typeof e.data === "string" && e.data.indexOf("ef/iframeOffset") !== -1) {
		var data = JSON.parse(e.data);
		//console.log(data);
		ef.iframeBounds = data;
	} else if (e.data && typeof e.data === "string" && e.data.indexOf("ef/connectIframe") !== -1) {
		var data = JSON.parse(e.data);
		console.log(data);
		if (ef._iframeCode === data.iframeCode) {
			ef._iframeID = data.iframeID;
			if (!ef._iframeSenderID && data.senderID)
				ef._iframeSenderID = data.senderID;
			var answer = {
				tag: "ef/connectIframeAnswer",
				code: ef._iframeCode,
				iframeID: data.iframeID,
				senderID: ef._iframeSenderID
			}
			parent.postMessage(JSON.stringify(answer, null, 0), "*");
			setTimeout(ef.adjustIframeSize, 10);
		}
	}
}

ef.adjustIframeSize = function () {
	if (!ef._iframeID)
		return;
	var contentHeight = document.body.offsetHeight;
	$("body > *").each(function (elementIndex, element) {
		if (element.id && (element.id.toLowerCase().indexOf("overlay") !== -1 || element.id.toLowerCase().indexOf("loading") !== -1))
			return;
		var elementOffset = element.getBoundingClientRect();
		var bottom = elementOffset.top + elementOffset.height;
		if (bottom > contentHeight)
			contentHeight = bottom;
	});
	contentHeight += 150;
	contentHeight = Math.floor(contentHeight);
	var isChanged = ef._lastContentHeight === undefined || ef._lastContentHeight != contentHeight;
	var isForceTime = ef._adjustIframeSizeTime === undefined || (new Date() - ef._adjustIframeSizeTime) > 1000;
	if (isChanged || isForceTime) {
		ef._lastContentHeight = contentHeight;
		ef._adjustIframeSizeTime = new Date();
		//console.log("adjustIframeSize");
		if (ef._iframeSenderID)
			parent.postMessage("<message senderId=" + ef._iframeSenderID + ">resize(100%," + contentHeight + ")</message>", "*");
		else {
			var message = {
				tag: "ef/adjustIframeSize",
				iframeID: ef._iframeID,
				senderID: ef._iframeSenderID,
				height: contentHeight
			}
			parent.postMessage(JSON.stringify(message, null, 0), "*");
		}
	}
	setTimeout(ef.adjustIframeSize, 300);
}

ef.getActiveContextID = function () {
	var contextID = null;

	for (var i = ef.popups.length - 1; i >= 0; i--) {
		var popup = ef.popups[i];
		if (popup.context) {
			contextID = popup.context;
			break;
		}
	}
	if (!contextID) {
		for (var id in ef.pageUI.contexts) {
			contextID = id;
			break;
		}
	}

	return contextID;
}

ef.getActiveContextElement = function () {
	var element = null;
	var contextID = ef.getActiveContextID();
	if (contextID) {
		var contextUI = ef.pageUI.contexts[contextID];
		element = contextUI.$ui[0];
	}
	return element;
}

ef.getDataField = function (data, record, fieldName) {
	var fieldIndex = ef.findIndex(data.fields, "name", fieldName);
	return record[fieldIndex];
}

ef.setDataField = function (data, record, fieldName, value) {
	var fieldIndex = ef.findIndex(data.fields, "name", fieldName);
	record[fieldIndex] = value;
}

ef.cloneDataScheme = function (data) {
	var clone = {};
	clone.type = data.type;
	clone.id = data.id;
	clone.displayName = data.displayName;

	if (data.type === "DataSource") {
		clone.dataSets = [];
		for (var dataSetIndex = 0; dataSetIndex < data.dataSets.length; dataSetIndex++) {
			clone.dataSets.push({
				fields: data.dataSets[dataSetIndex].fields,
				items: []
			});
		}
	} else {
		clone.fields = data.fields;
		clone.items = [];
	}

	return clone;
}

ef.cloneDataRecord = function (record) {
	return record.slice(0);
}

ef.parseData = function (data) {
	var originalDataSet = data.type === "DataSource" ? data.dataSets[0] : data;
	var parsedData = [];

	for (var itemIndex = 0; itemIndex < originalDataSet.items.length; itemIndex++) {
		var originalItem = originalDataSet.items[itemIndex];
		var parsedItem = {};

		for (var fieldIndex = 0; fieldIndex < originalDataSet.fields.length; fieldIndex++) {
			var field = originalDataSet.fields[fieldIndex];
			parsedItem[field.name] = ef.parseFieldValue(originalItem[fieldIndex], field);
		}

		parsedData.push(parsedItem);
	}

	return parsedData;
}

ef.parseParams = function (parameters) {
	var parsedParams = {};

	for (var i = 0; i < parameters.length; i++) {
		var parameter = parameters[i];
		parsedParams[parameter.name] = ef.parseFieldValue(parameter.value, parameter);
	}

	return parsedParams;
}

ef.cloneJson = function (json) {
	return $.parseJSON(JSON.stringify(json, null, 0))
}

ef.traverse = function (item, options) {
	var callback = options;
	var parentStack = null;
	var indexStack = null;
	var parent = item;
	var index = 0;
	var cursor = null;
	while (parent != null) {
		if (parent.type == "field") {
			cursor = parent;
			parent = null;
		}
		else if (parent.items != null) {
			if (index >= parent.items.length) {
				if (parentStack != null && parentStack.length != 0) {
					parent = parentStack.pop();
					index = indexStack.pop();
					continue;
				}
				else
					break;
			}
			else {
				cursor = parent.items[index];
				index++;
			}
		}
		else
			break;

		var isSkip = callback(cursor);
		if (isSkip !== undefined && isSkip !== null && !isSkip)
			continue;

		if (cursor.items != null && cursor.items.length != 0) {
			if (parentStack == null) {
				parentStack = [];
				indexStack = [];
			}
			parentStack.push(parent);
			indexStack.push(index);
			parent = cursor;
			index = 0;
		}
	}
}

/* indexOf for IE8 */
if (!Array.prototype.indexOf) {
	Array.prototype.indexOf = function (val) {
		return jQuery.inArray(val, this);
	};
}