/*
 * Adiutor: Adiutor enables versatile editing options and modules to assist a variety of user actions to enhance the Wikipedia editing experience.
 * Author: Vikipolimer
 * Learn more at: https://meta.wikimedia.org/wiki/Adiutor
 * Licensing and Attribution: Licensed under Creative Commons Attribution-ShareAlike 4.0 International (CC BY-SA 4.0)
 * Module: Good article nomination
 */
/* <nowiki> */
// Get essential configuration from MediaWiki
var mwConfig = mw.config.get(["skin", "wgAction", "wgArticleId", "wgPageName", "wgNamespaceNumber", "wgTitle", "wgUserGroups", "wgUserName", "wgUserEditCount", "wgUserRegistration", "wgCanonicalNamespace"]);
var api = new mw.Api();
var adiutorUserOptions = JSON.parse(mw.user.options.get('userjs-adiutor'));
var NominatedPreviously;
var nextNominationNumber = 0;

function GoodArticleNominationDialog(config) {
	GoodArticleNominationDialog.super.call(this, config);
}
OO.inheritClass(GoodArticleNominationDialog, OO.ui.ProcessDialog);
GoodArticleNominationDialog.static.name = 'GoodArticleNominationDialog';
GoodArticleNominationDialog.static.title = 'Adiutor (Beta) - Kaliteli Madde Adaylığı';
GoodArticleNominationDialog.static.actions = [{
	action: 'save',
	label: 'Devam',
	flags: ['primary', 'progressive']
}, {
	label: 'İptal',
	flags: 'safe'
}];
GoodArticleNominationDialog.prototype.initialize = function() {
	GoodArticleNominationDialog.super.prototype.initialize.apply(this, arguments);
	var headerTitle = new OO.ui.MessageWidget({
		type: 'error',
		inline: true,
		label: new OO.ui.HtmlSnippet('<strong>Kaliteli Madde Adaylığı</strong><br><small>Kaliteli maddeler, konuları hakkında iyi yazılmış, nesnel gerçekliğe ve doğrulanabilirliğe sahip, kalıcı maddelerdir. Bu nedenle <a href="https://tr.wikipedia.org/wiki/Vikipedi:Kaliteli_madde_kriterleri">bazı kriterleri sağlamaları gerekir</a>. Eğer bu konuda şüpheniz veya maddeyi aday göstermeden önce daha da geliştirebilmek için görüş almaya ihtiyacınız varsa madde incelemesi için başvurabilirsiniz.')
	});
	var headerTitle2 = new OO.ui.MessageWidget({
		type: 'warning',
		inline: true,
		label: new OO.ui.HtmlSnippet('<strong>Bir maddeyi aday göstermeden önce, maddenin kaliteli madde kriterlerinin tamamını karşıladığından emin olun. Halihazırda açık bir <a href="https://tr.wikipedia.org/wiki/Vikipedi:Madde_incelemesi">madde incelemesi</a> tartışması varsa, bunun sonlanmasını bekleyin.</small>')
	});
	NominateOptions = new OO.ui.FieldsetLayout({});
	NominateOptions.addItems([
		rationaleField = new OO.ui.FieldLayout(rationaleInput = new OO.ui.MultilineTextInputWidget({
			placeholder: 'Bu sayfayı neden aday göstermek istiyorsun?',
			indicator: 'required',
			value: '',
		}), {
			label: 'Gerekçe',
			align: 'inline',
		})
	]);
	this.content = new OO.ui.PanelLayout({
		padded: true,
		expanded: false,
		isDraggable: true
	});
	this.content.$element.append(headerTitle.$element, '<br>', headerTitle2.$element, '<br>', NominateOptions.$element);
	this.$body.append(this.content.$element);
};
GoodArticleNominationDialog.prototype.getActionProcess = function(action) {
	var dialog = this;
	if(action) {
		return new OO.ui.Process(function() {
			var GFATemplate;
			var ActionOptions = [];
			NominateOptions.items.forEach(function(Option) {
				if(Option.fieldWidget.selected) {
					ActionOptions.push({
						value: Option.fieldWidget.value,
						selected: Option.fieldWidget.selected
					});
				}
				if(Option.fieldWidget.value === true) {
					ActionOptions.push({
						value: Option.fieldWidget.value,
						data: Option.fieldWidget.data
					});
				}
			});
			checkPreviousNominations("Vikipedi:Kaliteli madde adayları/" + mwConfig.wgPageName).then(function(data) {
				if(data.query.pages["-1"]) {
					var nomCount = 0;
					console.log(nomCount);
					NominatedPreviously = false;
					GFATemplate = '{{KMA}}';
					putTemplate(GFATemplate, nextNominationNumber);
				} else {
					Rec(2);
				}
			});

			function Rec(nomCount) {
				checkPreviousNominations("Vikipedi:Kaliteli madde adayları/" + mwConfig.wgPageName + ' ' + '(' + nomCount + '._aday_gösterme)').then(function(data) {
					if(!data.query.pages["-1"]) {
						Rec(nomCount + 1);
					} else {
						nextNominationNumber = nomCount++;
						console.log(nextNominationNumber);
						if(nextNominationNumber > 1) {
							GFATemplate = '{{KMA|' + nextNominationNumber + '|' + '}}';
						} else {
							GFATemplate = '{{KMA}}';
						}
						console.log(GFATemplate);
						putTemplate(GFATemplate, nextNominationNumber);
					}
				});
			}
			dialog.close({
				action: action
			});
			showProgress();
		});
	}
	return GoodArticleNominationDialog.super.prototype.getActionProcess.call(this, action);
};
var windowManager = new OO.ui.WindowManager();
$(document.body).append(windowManager.$element);
var dialog = new GoodArticleNominationDialog({
	size: 'large',
	classes: ['afd-helper-window'],
	isDraggable: true
});
windowManager.addWindows([dialog]);
windowManager.openWindow(dialog);

function putTemplate(GFATemplate, nextNominationNumber) {
	var nominatedPage;
	if(nextNominationNumber > 1) {
		nominatedPage = mwConfig.wgPageName + ' (' + nextNominationNumber + '._aday_gösterme)';
	} else {
		nominatedPage = mwConfig.wgPageName;
	}
	api.postWithToken('csrf', {
		action: 'edit',
		title: 'Tartışma:' + mwConfig.wgPageName,
		prependtext: GFATemplate + "\n",
		summary: 'Sayfa [[VP:KMA|kaliteli madde adayı]] gösterildi',
		tags: 'Adiutor',
		format: 'json'
	}).done(function() {
		createNominationPage(nominatedPage);
		logNomination(nominatedPage);
	});
}

function checkPreviousNominations(title) {
	return api.get({
		action: 'query',
		prop: 'revisions',
		rvlimit: 1,
		rvprop: ['user'],
		rvdir: 'newer',
		titles: title,
	});
}

function createNominationPage(nominatedPage) {
	api.postWithToken('csrf', {
		action: 'edit',
		title: 'Vikipedi:Kaliteli_madde_adayları/' + nominatedPage,
		appendtext: '=== [[' + mwConfig.wgPageName.replace(/_/g, " ") + ']] === \n' + rationaleInput.value + ' ~~~~' + "\n",
		summary: 'Sayfa [[VP:KMA|kaliteli madde adayı]] gösterildi',
		tags: 'Adiutor',
		format: 'json'
	}).done(function() {
		addNominationToGaPage(nominatedPage);
	});
}

function addNominationToGaPage(nominatedPage) {
	var pageContent;
	api.get({
		action: 'parse',
		page: "Vikipedi:Kaliteli_madde_adayları",
		prop: 'wikitext',
		format: "json"
	}).done(function(data) {
		pageContent = data.parse.wikitext['*'];
		var NominatedBefore = pageContent.includes("{{Vikipedi:Kaliteli madde adayları/" + nominatedPage.replace(/_/g, " ") + "}}");
		if(!NominatedBefore) {
			api.postWithToken('csrf', {
				action: 'edit',
				title: "Vikipedi:Kaliteli_madde_adayları",
				appendtext: "\n" + "{{Vikipedi:Kaliteli madde adayları/" + nominatedPage.replace(/_/g, " ") + "}}",
				summary: "Adaylık [[Vikipedi:Kaliteli madde adayları|kma]] listesine eklendi.",
				tags: 'Adiutor',
				format: 'json'
			}).done(function() {
				addNominationToGaLogPage(nominatedPage);
			});
		}
	});
}

function addNominationToGaLogPage(nominatedPage) {
	var date = new Date();
	var date_months = ["Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran", "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık"];
	var date_year = date.getUTCFullYear();
	var month_name = date_months[date.getUTCMonth()];
	var pageContent;
	api.get({
		action: 'parse',
		page: "Vikipedi:Kaliteli_madde_adayları/Arşiv/" + month_name + "_" + date_year,
		prop: 'wikitext',
		format: "json"
	}).done(function(data) {
		pageContent = data.parse.wikitext['*'];
		var NominatedBefore = pageContent.includes("{{Vikipedi:Kaliteli madde adayları/" + nominatedPage.replace(/_/g, " ") + "}}");
		//Eğer daha önce aday gösterilmişe
		if(!NominatedBefore) {
			api.postWithToken('csrf', {
				action: 'edit',
				title: "Vikipedi:Kaliteli_madde_adayları/Arşiv/" + month_name + "_" + date_year,
				appendtext: "\n" + "{{Vikipedi:Kaliteli madde adayları/" + nominatedPage.replace(/_/g, " ") + "}}",
				summary: "Adaylık [[Vikipedi:Kaliteli madde adayları/Arşiv/" + month_name + " " + date_year + "|mevcut ayın]] kayıtlarına eklendi.",
				tags: 'Adiutor',
				format: 'json'
			}).done(function() {
				window.location = '/wiki/Vikipedi:Kaliteli madde adayları/' + nominatedPage.replace(/_/g, " ");
			});
		} else {
			window.location = '/wiki/Vikipedi:Kaliteli madde adayları/' + nominatedPage.replace(/_/g, " ");
		}
	});
}

function showProgress() {
	var processStartedDialog = new OO.ui.MessageDialog();
	var progressBar = new OO.ui.ProgressBarWidget();
	var windowManager = new OO.ui.WindowManager();
	$(document.body).append(windowManager.$element);
	windowManager.addWindows([processStartedDialog]);
	windowManager.openWindow(processStartedDialog, {
		title: mw.msg('processing'),
		message: progressBar.$element
	});
}
/* </nowiki> */