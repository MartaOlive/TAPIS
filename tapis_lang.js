"use strict"

/* 
	This file is part of TAPIS. TAPIS is a web page and a Javascript code 
	that builds queries and explore the STAplus content, saves it as CSV or 
	GeoJSON and connects with the MiraMon Map Browser. While the project is 
	completely independent from the Orange data mining software, it has been 
	inspired by its GUI. The general idea of the application is to be able 
	to work with STA data as tables.
  
	The TAPIS client is free software under the terms of the MIT License

	Copyright (c) 2023-2026 Joan Maso

	Permission is hereby granted, free of charge, to any person obtaining a copy
	of this software and associated documentation files (the "Software"), to deal
	in the Software without restriction, including without limitation the rights
	to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
	copies of the Software, and to permit persons to whom the Software is
	furnished to do so, subject to the following conditions:

	The above copyright notice and this permission notice shall be included in all
	copies or substantial portions of the Software.

	THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
	IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
	FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
	AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
	LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
	OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
	SOFTWARE.
	
	Language helpers aligned with MiraMon DonaCadena / ParamCtrl.idioma.
	Language preference is stored in localStorage only (not cookies).
*/

var ParamCtrl = (typeof ParamCtrl !== "undefined" && ParamCtrl) ? ParamCtrl : { idioma: "eng" };

var TapisIdiomesAdmesos = ["eng", "cat", "spa"];
var TapisIdiomaStorageKey = "TapisIdioma";

function DonaCadena(a)
{
	if (a == null || !ParamCtrl || ParamCtrl.idioma == null)
		return a;

	if (a.cat && ParamCtrl.idioma == "cat")
		return a.cat;
	if (a.spa && ParamCtrl.idioma == "spa")
		return a.spa;
	if (a.eng && ParamCtrl.idioma == "eng")
		return a.eng;
	if (a.fre && ParamCtrl.idioma == "fre")
		return a.fre;
	if (a.cze && ParamCtrl.idioma == "cze")
		return a.cze;
	if (a.ger && ParamCtrl.idioma == "ger")
		return a.ger;
	if (a.eng)   //Si no hi ha l'idioma solicitat faig que xerri en angles
		return a.eng;

	if (a.cat == null && a.spa == null && a.eng == null && a.fre == null && a.cze == null && a.ger == null)  //Cas de cadena no multiidioma
		return a;
	return null;
}

function DonaCadenaFmt(a)
{
	var s = DonaCadena(a);
	if (s == null)
		return s;
	var args = Array.prototype.slice.call(arguments, 1);
	for (var i = 0; i < args.length; i++)
		s = s.split("{" + i + "}").join(args[i] == null ? "" : String(args[i]));
	return s;
}

function EscapeForHelpTooltip(s)
{
	if (s == null)
		return "";
	/* HTML attribute is single-quoted; JS string inside uses double quotes.
	   Escape for BOTH contexts so Catalan apostrophes do not break the markup. */
	return String(s)
		.replace(/&/g, "&amp;")
		.replace(/"/g, "&quot;")
		.replace(/'/g, "&#39;")
		.replace(/\r?\n/g, " ");
}

function EscapeForJsHtmlAttr(s)
{
	if (s == null)
		return "";
	return String(s)
		.replace(/\\/g, "\\\\")
		.replace(/&/g, "&amp;")
		.replace(/"/g, "&quot;")
		.replace(/'/g, "&#39;")
		.replace(/\r?\n/g, " ");
}

function IsTapisIdiomaAdmes(idioma)
{
	return idioma && TapisIdiomesAdmesos.indexOf(idioma) != -1;
}

function GetTapisIdiomaDesat()
{
	try {
		var v = localStorage.getItem(TapisIdiomaStorageKey);
		if (IsTapisIdiomaAdmes(v))
			return v;
	} catch (e) {}
	/* One-time migration from old cookie, then clear it */
	try {
		var prefix = TapisIdiomaStorageKey + "=";
		var parts = document.cookie.split(";");
		for (var i = 0; i < parts.length; i++) {
			var c = parts[i].trim();
			if (c.indexOf(prefix) == 0) {
				var fromCookie = decodeURIComponent(c.substring(prefix.length));
				if (IsTapisIdiomaAdmes(fromCookie)) {
					SetTapisIdiomaDesat(fromCookie);
					return fromCookie;
				}
			}
		}
	} catch (e2) {}
	return null;
}

function SetTapisIdiomaDesat(idioma)
{
	try {
		localStorage.setItem(TapisIdiomaStorageKey, idioma);
	} catch (e) {}
	try {
		document.cookie = TapisIdiomaStorageKey + "=; Max-Age=0; path=/; SameSite=Lax";
	} catch (e2) {}
}

function GetTapisLanguageFromURL()
{
	if (!location.search || location.search.charAt(0) != "?")
		return null;
	var kvp = location.search.substring(1).split("&");
	for (var i = 0; i < kvp.length; i++) {
		var j = kvp[i].indexOf("=");
		if (j == -1)
			continue;
		var key = kvp[i].substring(0, j).toUpperCase();
		if (key == "LANGUAGE" || key == "LANG") {
			var val = decodeURIComponent(kvp[i].substring(j + 1)).toLowerCase();
			return IsTapisIdiomaAdmes(val) ? val : null;
		}
	}
	return null;
}

function ResolveTapisIdiomaInicial()
{
	var fromUrl = GetTapisLanguageFromURL();
	if (fromUrl)
		return fromUrl;
	var fromStore = GetTapisIdiomaDesat();
	if (fromStore)
		return fromStore;
	return "eng";
}

function updateTapisLangFlags()
{
	var flags = document.getElementById("TapisLangFlags");
	if (!flags)
		return;
	var buttons = flags.querySelectorAll(".TapisLangFlag");
	for (var i = 0; i < buttons.length; i++) {
		var lang = buttons[i].getAttribute("data-lang");
		if (lang == ParamCtrl.idioma)
			buttons[i].classList.add("TapisLangActive");
		else
			buttons[i].classList.remove("TapisLangActive");
	}
}

function applyDialogI18n()
{
	/* data-lang holds either a language code on flag buttons (cat|spa|eng)
	   or a JSON object {cat,spa,eng} on translatable UI text. Only JSON is applied here. */
	var nodes = document.querySelectorAll("[data-lang]");
	for (var i = 0; i < nodes.length; i++) {
		var el = nodes[i];
		var raw = el.getAttribute("data-lang");
		if (!raw)
			continue;
		raw = raw.trim();
		if (raw.charAt(0) != "{")
			continue;
		var obj;
		try {
			obj = JSON.parse(raw);
		} catch (e) {
			continue;
		}
		var text = DonaCadena(obj);
		if (text == null)
			continue;
		var attr = el.getAttribute("data-lang-attr");
		if (attr)
			el.setAttribute(attr, text);
		else
			el.textContent = text;
	}
	if (typeof ApplyTapisDialogI18nExtra == "function")
		ApplyTapisDialogI18nExtra();
}

function CanviaIdiomaTapis(idioma)
{
	if (!IsTapisIdiomaAdmes(idioma))
		idioma = "eng";
	ParamCtrl.idioma = idioma;
	SetTapisIdiomaDesat(idioma);
	if (document.documentElement)
		document.documentElement.lang = (idioma == "cat" ? "ca" : (idioma == "spa" ? "es" : "en"));
	updateTapisLangFlags();
	applyDialogI18n();
	if (typeof RefreshClarificationPanel == "function")
		RefreshClarificationPanel();
	if (typeof PlaceButtonsSTAEntities == "function")
		PlaceButtonsSTAEntities();
	if (typeof PopulateContextMenu == "function")
		PopulateContextMenu();
}

function InitTapisLanguage()
{
	if (!ParamCtrl)
		ParamCtrl = { idioma: "eng" };
	var idioma = ResolveTapisIdiomaInicial();
	var fromUrl = GetTapisLanguageFromURL();
	ParamCtrl.idioma = idioma;
	if (fromUrl || !GetTapisIdiomaDesat())
		SetTapisIdiomaDesat(idioma);
	if (document.documentElement)
		document.documentElement.lang = (idioma == "cat" ? "ca" : (idioma == "spa" ? "es" : "en"));
	updateTapisLangFlags();
	applyDialogI18n();
}
