function updCountObj(){
	if (pre_hamlet){
		if (!hc_count_obj['bgc']) hc_count_obj['bgc'] = '#EEEEEE';
		if (!hc_count_obj['bgi']) hc_count_obj['bgi'] = '';
		hc_count_obj['w'] = 154;
		hc_count_obj['h'] = 200;
		hc_count_obj['tex'] = 'hamlet.png';
		hc_count_obj['spac'] = 140;
		if (!hc_count_obj['tc']) hc_count_obj['tc'] = '#101010';
		if (!hc_count_obj['bshadow']) hc_count_obj['bshadow'] = '0 0 4px rgba(20, 0, 50, 0.5)';
	}
	else{
		if (!hc_count_obj['bgc']) hc_count_obj['bgc'] = '#EEEEEE';
		if (!hc_count_obj['bgi']) hc_count_obj['bgi'] = '';
		if (!hc_count_obj['w']) hc_count_obj['w'] = 50;
		if (!hc_count_obj['h']) hc_count_obj['h'] = 64;
		if (!hc_count_obj['tex']) hc_count_obj['tex'] = 'default.png';
		if (!hc_count_obj['spac']) hc_count_obj['spac'] = 50;
		if (!hc_count_obj['tc']) hc_count_obj['tc'] = '#101010';
		if (!hc_count_obj['bshadow']) hc_count_obj['bshadow'] = '0 0 4px rgba(20, 0, 50, 0.5)';
	}
}

var ua = navigator.userAgent.toLowerCase();
var hc_browser_id = 0;
if (ua.indexOf("msie") != -1 && ua.indexOf("opera") == -1 && ua.indexOf("webtv") == -1) hc_browser_id = 1;
if (ua.indexOf("opera") != -1) hc_browser_id = 2;
if (ua.indexOf("gecko") != -1) hc_browser_id = 3;
if (ua.indexOf("safari") != -1) hc_browser_id = 4;
if (ua.indexOf("konqueror") != -1) hc_browser_id = 5;

String.prototype.stripTags = function() {
  return this.replace(/<\/?[^>]+>/g, '');
};

function setInnerHTML(id, text){
	var y = document.getElementById(id);
	if (y) y.innerHTML = text;
}

function addInnerHTML(id, text){
	var y = document.getElementById(id);
	if (y) y.innerHTML += text;
}

function setClickById(id, callback){
	var y = document.getElementById(id);
	if (y) y.click = callback;
}

function setValueById(id, val){
	var y = document.getElementById(id);
	if (y) y.value = val;
}

function getValueById(id){
	var y = document.getElementById(id);
	return y ? y.value : 0;
}

function getNumValueById(id){
	var y = document.getElementById(id);
	if (y){
		var res = parseFloat(y.value);
		if (isNaN(res)) res = 0;
		return res;
	}
	return 0;
}

function getTestNumValueById(id){
	var y = document.getElementById(id);
	if (y){
		var res = parseFloat(y.value);
		if (isNaN(res)) res = 0;
		return {num:res, val:y.value};
	}
	return 0;
}

function getStrValueById(id){
	var y = document.getElementById(id);
	return y ? y.value.stripTags() : '';
}

function getStyleById(id){
	var y = document.getElementById(id);
	if (y) return y.style;
	return null;
}

function setBgById(id, v){
	alert('setBg');
	var y = document.getElementById(id);
	if (y && y.style) y.style.background = v;
}

function setBgColorById(id, v){
	var y = document.getElementById(id);
	if (y && y.style) y.style.background = v;
}

function setColorById(id, v){
	var y = document.getElementById(id);
	if (y && y.style) y.style.color = v;
}

function setCheckedById(id, state){
	var y = document.getElementById(id);
	y.checked = state;
}

function setFocusById(id, sel){
	var y = document.getElementById(id);
	y.focus();
	if (sel && y.select) y.select();
	return hc_event_result;
}

function setPlaceholderById(id, ph){
	var y = document.getElementById(id);
	y.placeholder = ph;
	return hc_event_result;
}

function setHrefById(id, href){
	var y = document.getElementById(id);
	if (y) y.href = href;
	return hc_event_result;
}

function setSrcById(id, src){
	var y = document.getElementById(id);
	if (y) y.src = src;
	return hc_event_result;
}

var hideValues = new Array();

function hideById(id){
	var y = document.getElementById(id);
	if (y){
		var st = y.style;
		if (st){
			if (st.display != 'none') hideValues[id] = st.display;
			else hideValues[id] = 'block';
			st.display = 'none';
		}
	}
}

function showById(id){
	var y = document.getElementById(id);
	if (y){
		var st = y.style;
		if (st){
			var hv = hideValues[id];
			if(typeof(hv) != 'undefined') st.display = hv;
			else st.display = 'block';
		}
	}
}

function viewById(id, v){
	if (v) showById(id);
	else hideById(id);
}

function dbg(val){
	addInnerHTML('mf_dbg', val + '<br/>');
}

var mc_ajax = {
	root : null,
	init : function(){
		var xmlHttp = false;
		/*@cc_on @*/
		/*@if (@_jscript_version >= 5)
		try {
		  xmlHttp = new ActiveXObject("Msxml2.XMLHTTP");
		} catch (e) {
		  try {
			xmlHttp = new ActiveXObject("Microsoft.XMLHTTP");
		  } catch (e2) {
			xmlHttp = false;
		  }
		}
		@end @*/

		if (!xmlHttp && typeof XMLHttpRequest != 'undefined') {
		  xmlHttp = new XMLHttpRequest();
		}
		mc_ajax.root = xmlHttp;
	}
}

var Base64 = {
	_keyStr : "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=",
	encode : function (input) {
		var output = "";
		var chr1, chr2, chr3, enc1, enc2, enc3, enc4;
		var i = 0;

		input = Base64._utf8_encode(input);

		while (i < input.length) {

			chr1 = input.charCodeAt(i++);
			chr2 = input.charCodeAt(i++);
			chr3 = input.charCodeAt(i++);

			enc1 = chr1 >> 2;
			enc2 = ((chr1 & 3) << 4) | (chr2 >> 4);
			enc3 = ((chr2 & 15) << 2) | (chr3 >> 6);
			enc4 = chr3 & 63;

			if (isNaN(chr2)) {
				enc3 = enc4 = 64;
			} else if (isNaN(chr3)) {
				enc4 = 64;
			}

			output = output +
			this._keyStr.charAt(enc1) + this._keyStr.charAt(enc2) +
			this._keyStr.charAt(enc3) + this._keyStr.charAt(enc4);

		}

		return output;
	},
	decode : function (input) {
		var output = "";
		var chr1, chr2, chr3;
		var enc1, enc2, enc3, enc4;
		var i = 0;

		input = input.replace(/[^A-Za-z0-9\+\/\=]/g, "");

		while (i < input.length) {

			enc1 = this._keyStr.indexOf(input.charAt(i++));
			enc2 = this._keyStr.indexOf(input.charAt(i++));
			enc3 = this._keyStr.indexOf(input.charAt(i++));
			enc4 = this._keyStr.indexOf(input.charAt(i++));

			chr1 = (enc1 << 2) | (enc2 >> 4);
			chr2 = ((enc2 & 15) << 4) | (enc3 >> 2);
			chr3 = ((enc3 & 3) << 6) | enc4;

			output = output + String.fromCharCode(chr1);

			if (enc3 != 64) {
				output = output + String.fromCharCode(chr2);
			}
			if (enc4 != 64) {
				output = output + String.fromCharCode(chr3);
			}

		}

		output = Base64._utf8_decode(output);

		return output;

	},
	_utf8_encode : function (string) {
		string = string.replace(/\r\n/g,"\n");
		var utftext = "";

		for (var n = 0; n < string.length; n++) {

			var c = string.charCodeAt(n);

			if (c < 128) {
				utftext += String.fromCharCode(c);
			}
			else if((c > 127) && (c < 2048)) {
				utftext += String.fromCharCode((c >> 6) | 192);
				utftext += String.fromCharCode((c & 63) | 128);
			}
			else {
				utftext += String.fromCharCode((c >> 12) | 224);
				utftext += String.fromCharCode(((c >> 6) & 63) | 128);
				utftext += String.fromCharCode((c & 63) | 128);
			}

		}

		return utftext;
	},
	_utf8_decode : function (utftext) {
		var string = "";
		var i = 0;
		var c = c1 = c2 = 0;

		while ( i < utftext.length ) {

			c = utftext.charCodeAt(i);

			if (c < 128) {
				string += String.fromCharCode(c);
				i++;
			}
			else if((c > 191) && (c < 224)) {
				c2 = utftext.charCodeAt(i+1);
				string += String.fromCharCode(((c & 31) << 6) | (c2 & 63));
				i += 2;
			}
			else {
				c2 = utftext.charCodeAt(i+1);
				c3 = utftext.charCodeAt(i+2);
				string += String.fromCharCode(((c & 15) << 12) | ((c2 & 63) << 6) | (c3 & 63));
				i += 3;
			}

		}

		return string;
	}

}

var hc_temp_date = new Date();
var hc_tz_val = hc_temp_date.getTimezoneOffset();
var	hc_tz_stamp = hc_tz_val * 60000;
var hc_stamp_0y = -62168515200000 + hc_tz_stamp;
var hc_event_table_max_stamp = 253375862400000;

var hc_counter = new Array();
var hc_event_array = new Array();
var hc_last_born_date = 0;
var hc_event_offset = 0;

var MCSTAMP0Y = -62167219200000,
	MCYTSTAMP_MAX = 884572963200000,
	MCYTSTAMP_MIN = -1008907315200000;

function hc_get_tz_str(tz_val, isGMT){
	var tz_h = (tz_val/3600)^0;
	var tz_m = Math.abs(((tz_val%3600)/60)^0);
	var tz_s = tz_val %60;
	tz_h = hc_tn(tz_h);
	tz_m = hc_tn(tz_m);
	tz_s = tz_s ? hc_tn(tz_s) : '';
	var tz_t = '';
	if (tz_val != 0){
		tz_t = tz_h + ':' + tz_m;
		if (tz_s) tz_t += ':' + tz_s;
		if (tz_val > 0) tz_t = '+' + tz_t;
		tz_t = ' ' + tz_t;
	}
	if (isGMT) return '(GMT' + tz_t + ')';
	return '(UTC' + tz_t + ')';
}

function hc_NumToStr(val){
	var ac = Math.floor(val) + '';
	var result = '';
	while (ac.length > 3){
		if (result.length > 0)
			result = ac.substr(ac.length - 3, 3) + " " + result;
		else
			result = ac.substr(ac.length - 3, 3);
		ac = ac.substr(0, ac.length - 3);
	};
	if (result.length > 0)
		result = ac + " " + result;
	else
		result = ac;
	return result;
}

function hc_getDupNum (t , d){
	res = '';
	for (var i = 0 ; i < d; i++){
		res += t;
	}
	return res;
}

function hc_tn(n){
	if (n < 10 && n >= 0) return '0' + n;
	else if (n < 0 && n > -10) return '-0' + (-n);
	return n;
}

function hc_td(n){return tx.days[n];}
function hc_tm(n){return tx.month[n];}
function hc_tmrp(n){return tx.month_rp[n];}

//////////////////////////////////////////////
var mc_date_hlp = {
	month365 : [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31],
	month366 : [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31],
	dayInYear : function(y){
		if ((y % 400) == 0 || ((y % 100) != 0) && (y % 4) == 0) return 366;
		else return 365;
	},
	getDaysForYear : function(cnt){
		if (cnt >= 0) return cnt * 365 + (((cnt + 1)/ 4)^0) - (((cnt + 69)/ 100)^0) + (((cnt + 369)/ 400)^0);
		else return cnt * 365 + (((cnt - 2)/ 4)^0) - (((cnt - 30)/ 100)^0) + (((cnt - 30)/ 400)^0);
	}
}

function mc_date(){
	this.y = 0;
	this.m = 0;
	this.d = 0;
	this.h = 0;
	this.i = 0;
	this.s = 0;
	this.ms = 0;
	this.day = 0;
	return this;
}

mc_date.prototype.addDate = function(obj){
	for(var ppp in obj) this[ppp] += obj[ppp];
}

mc_date.prototype.setDate = function(obj){
	for(var ppp in obj) this[ppp] = obj[ppp];
}

mc_date.prototype.setTime = function(t){
	var fd = (t/86400000) ^ 0;
	this.day = fd % 7;
	if (this.day < 0) this.day += 7;
	this.day = (this.day + 4) % 7;
	var ty = (fd / 365.25) ^ 0;
	var fdac = fd - mc_date_hlp.getDaysForYear(ty);
	this.y = 1970 + ty;
	this.m = 0;
	
	var trest = t % 86400000;
	if (trest < 0){
		trest += 86400000;
		fdac--;
	}
	
	while (fdac < 0){
		this.y--;
		fdac += mc_date_hlp.dayInYear(this.y);
	}
	while (fdac > mc_date_hlp.dayInYear(this.y)){
		fdac -= mc_date_hlp.dayInYear(this.y);
		this.y++;
	}
	
	var subTable = (mc_date_hlp.dayInYear(this.y) == 365) ? mc_date_hlp.month365 : mc_date_hlp.month366;
	var i = 0;
	while (fdac + 1 > subTable[i]){
		fdac -= subTable[i];
		this.m++;
		i++;
	}
	this.y += (this.m / 12) ^ 0;
	this.m = this.m % 12;
	this.d = fdac;
	this.h = (trest / 3600000) ^ 0;
	trest %= 3600000;
	this.i = (trest / 60000) ^ 0;
	trest %= 60000;
	this.s = (trest / 1000) ^ 0;
	this.ms = trest % 1000;

}

mc_date.prototype.getTime = function(){
	var res = this.ms + this.s * 1000 + this.i * 60000 + this.h * 3600000;
	var diny = 0;
	var y =  this.y + ((this.m / 12)^0);
	var m = this.m % 12;
	if (m < 0) {
		m += 12;
		y--;
	}
	var addTable = (mc_date_hlp.dayInYear(y) == 365) ? mc_date_hlp.month365 : mc_date_hlp.month366;
	for (var i = 0; i < m; i++){
		diny += addTable[i];
	}
	var fd = y - 1970;
	res += (mc_date_hlp.getDaysForYear(fd) + diny + this.d) * 86400000;
	return res;
}


mc_date.prototype.normalize = function(){
	this.setTime(this.getTime());
}

//////////////////////////////////////////////
function cropNumber(n, d){
	var str = String(n) + '000000000000';
	return '&#x25cf;' + str.substr(2, d);
}

function getRestMode1(t, r, n){
	var ld = Math.floor(t/r) * r;
	var res = (t - ld)/r;
	return cropNumber(res, n);
}

function getRestMonth(t, n){
	var dobj = new mc_date(); dobj.setTime(t);
	dobj.setDate({ms:0, s:0, i:0, h:0, d:0});
	var lt = dobj.getTime();
	dobj.addDate({m:1});
	var ht = dobj.getTime();
	return cropNumber((t - lt)/(ht - lt), n);
}

function getRestYear(t, n){
	var dobj = new mc_date(); dobj.setTime(t);
	dobj.setDate({ms:0, s:0, i:0, h:0, d:0, m:0});
	var lt = dobj.getTime();
	dobj.addDate({y:1});
	var ht = dobj.getTime();
	return cropNumber((t - lt)/(ht - lt), n);
}

function choiceStrFrom(t, strs){
	if (t == null){
		return strs[3];
	} else {
		t = t % 100;
		if (t > 10 && t < 20) return strs[0];
		else switch(t % 10){
			case 0: case 5: case 6: case 7: case 8: case 9: return strs[0];
			case 1: return strs[1];
			case 2: case 3: case 4: return strs[2];
		}
	}
	return 0;
}

var getYNumPlus = function(t){
	var res = 0;
	if (t < 10) res = 10;
	else{
		var tstr = new String(t);
		var dg1 = tstr.charAt(0) * 1;
		var dg2 = tstr.charAt(1) * 1;
		var res = (dg1 + 1) + hc_getDupNum(0, tstr.length - 1);
		var res2 = dg1 + '5' + hc_getDupNum(0, tstr.length - 2);
		if (res2 > t) res = Math.min(res, res2);
		var res3 = hc_getDupNum(dg1, tstr.length);
		if (res3 > t && tstr.length > 2 && dg1 != 9) res = Math.min(res, res3);
	}
	return res * 1;
}

var getYNumMinus = function(t){
	var res = 0;
	if (t < 10) res = 0;
	else{
		var tstr = new String(t);
		var dg1 = tstr.charAt(0) * 1;
		var dg2 = tstr.charAt(1) * 1;
		var res = dg1 + hc_getDupNum(0, tstr.length - 1);
		if (res == t) res = getYNumMinus(res - 1);
		var res2 = dg1 + '5' + hc_getDupNum(0, tstr.length - 2);
		if (res2 == t) getYNumMinus(res2 - 1);
		var res3 = hc_getDupNum(dg1, tstr.length);
		if (res2 < t) res = Math.max(res, res2);
		if (res3 < t && tstr.length > 2 && dg1 != 9) res = Math.max(res, res3);
	}
	return res * 1;
}

/////////////////////////////////////////
var hc_time_formats = new Array();

function metricObj(){
	return this;
}

metricObj.prototype.getMainMetric = function(t){
	return choiceStrFrom(t, this.txtArray);
}

var hc_tmp_obj = new metricObj();
hc_tmp_obj.getMainValue = function(t){
	return Math.floor((t - MCSTAMP0Y)/1000);
}
hc_tmp_obj.getDivValue = function(t){
	var dobj = new mc_date(); dobj.setTime(t);
	return  dobj.s;
}
hc_tmp_obj.getSubText = function(t, rm){
	if (rm == 0) return getRestMode1(t, 1000, 1);
	return '';
}
hc_tmp_obj.getStamp = function(t, bt, m){
	return t * m * 1000 + bt;
}
hc_tmp_obj.txtArray = tx.secArray;
hc_time_formats[1] = hc_tmp_obj;

hc_tmp_obj = new metricObj();
hc_tmp_obj.getMainValue = function(t){
	return Math.floor((t - MCSTAMP0Y)/60000);
}
hc_tmp_obj.getDivValue = function(t){
	var dobj = new mc_date(); dobj.setTime(t);
	return  dobj.i;
}
hc_tmp_obj.getSubText = function(t, rm){
	if (rm == 0) return getRestMode1(t, 60000, 3);
	else{
		var dobj = new mc_date(); dobj.setTime(t);
		return  ':' + hc_tn(dobj.s);
	}
}
hc_tmp_obj.getStamp = function(t, bt, m){
	return t * m * 60000 + bt;
}
hc_tmp_obj.txtArray = tx.minArray;
hc_time_formats[2] = hc_tmp_obj;

hc_tmp_obj = new metricObj();
hc_tmp_obj.getMainValue = function(t){
	return Math.floor((t - MCSTAMP0Y)/3600000);
}
hc_tmp_obj.getDivValue = function(t){
	var dobj = new mc_date(); dobj.setTime(t);
	return  dobj.h;
}
hc_tmp_obj.getSubText = function(t, rm){
	if (rm == 0) return getRestMode1(t, 3600000, 5);
	else{
		var dobj = new mc_date(); dobj.setTime(t);
		return  ':' + hc_tn(dobj.i) + ':' + hc_tn(dobj.s);
	}
}
hc_tmp_obj.getStamp = function(t, bt, m){
	return t * m * 3600000 + bt;
}
hc_tmp_obj.txtArray = tx.hourArray;
hc_time_formats[3] = hc_tmp_obj;

hc_tmp_obj = new metricObj();
hc_tmp_obj.getMainValue = function(t){
	return Math.floor((t - MCSTAMP0Y)/86400000);
}
hc_tmp_obj.getDivValue = function(t){
	var dobj = new mc_date(); dobj.setTime(t);
	return dobj.d;
}
hc_tmp_obj.getSubText = function(t, rm){
	if (rm == 0) return getRestMode1(t, 86400000, 6);
	else{
		var dobj = new mc_date(); dobj.setTime(t);
		return hc_tn(dobj.h) + ':' + hc_tn(dobj.i) + ':' + hc_tn(dobj.s);
	}
}
hc_tmp_obj.getStamp = function(t, bt, m){
	return t * m *86400000 + bt;
}
hc_tmp_obj.txtArray = tx.dayArray;
hc_time_formats[4] = hc_tmp_obj;


hc_tmp_obj = new metricObj();
hc_tmp_obj.getMainValue = function(t){
	return Math.floor((t - MCSTAMP0Y)/604800000);
}
hc_tmp_obj.getDivValue = function(t){
	var dobj = new mc_date(); dobj.setTime(t);
	return dobj.d;
}
hc_tmp_obj.getSubText = function(t, rm){
	if (rm == 0) return getRestMode1(t, 604800000, 7);
	else{
		var dobj = new mc_date(); dobj.setTime(t);
		return hc_td(dobj.day) + '  ' + hc_tn(dobj.h) + ':' + hc_tn(dobj.i) + ':' + hc_tn(dobj.s);
	}
}
hc_tmp_obj.getStamp = function(t, bt, m){
	return t * m * 604800000 + bt;
}
hc_tmp_obj.txtArray = tx.weekArray;
hc_time_formats[5] = hc_tmp_obj;

hc_tmp_obj = new metricObj();
hc_tmp_obj.getMainValue = function(t){
	var dobj = new mc_date(); dobj.setTime(t);
	return dobj.y * 12 + dobj.m;
}
hc_tmp_obj.getDivValue = function(t){
	var dobj = new mc_date(); dobj.setTime(t);
	return  dobj.m;
}
hc_tmp_obj.getSubText = function(t, rm){
	if (rm == 0) return getRestMonth(t, 7);
	else{
		var dobj = new mc_date(); dobj.setTime(t);
		return hc_tn(dobj.d + 1) + '  ' + hc_tn(dobj.h) + ':' + hc_tn(dobj.i) + ':' + hc_tn(dobj.s);
	}
}
hc_tmp_obj.getStamp = function(t, bt, m){
	var dobj = new mc_date(); dobj.setTime(bt);
	dobj.addDate({m: t * m});
	return dobj.getTime();
}
hc_tmp_obj.txtArray = tx.monthArray;
hc_time_formats[6] = hc_tmp_obj;

hc_tmp_obj = new metricObj();
hc_tmp_obj.getMainValue = function(t){
	var dobj = new mc_date(); dobj.setTime(t);
	return dobj.y;
}
hc_tmp_obj.getDivValue = function(t){
	var dobj = new mc_date(); dobj.setTime(t);
	return  dobj.y;
}
hc_tmp_obj.getSubText = function(t, rm){
	if (rm == 0) return getRestYear(t, 8);
	else{
		var dobj = new mc_date(); dobj.setTime(t);
		return hc_tm(dobj.m) + ', ' + hc_tn(dobj.d + 1) + '  ' + hc_tn(dobj.h) + ':' + hc_tn(dobj.i) + ':' + hc_tn(dobj.s);
	}
}
hc_tmp_obj.getStamp = function(t, bt, m){
	var dobj = new mc_date(); dobj.setTime(bt);
	dobj.addDate({y: t * m});
	return dobj.getTime();
}
hc_tmp_obj.txtArray = tx.yearArray;
hc_time_formats[7] = hc_tmp_obj;


function hc_helper(bt, btm, f){
	this.bornTime = bt;
	this.bornTimeMode = btm;
	this.format = f;
	this.ct = 0;
	
	
	/////bornTimeMode component
	this.tz = 0;//TimezoneOffset
	this.tzen = 1;//TimezoneOffset Enable
	this.cm = 1;//counter mult
	this.ent = 1;//enable time 0-no 2-hous 3-h:m 4-h:m:s
	this.restMode = 0;//режим отображения остатка
	this.isPeopleBorn = 0;//событие является датой рождения человека
	this.isGMT = 0;//Отображать как время GMT
	this.tzunk = 0;
	
	this.getTZ = function(){
		return this.tz & 0xffff | ((this.tzen & 0x1) << 16) | (((this.cm > 0) ? 0 : 1) << 17)  | ((this.ent & 0x7) << 18) | ((this.restMode & 0x1) << 21) | ((this.isPeopleBorn & 0x1) << 22) | ((this.isGMT & 0x1) << 23) | ((this.tzunk & 0x1) << 24);
	}
	
	this.setTZ = function(tz){
		this.tz = tz & 0xffff;
		this.tzen = (tz >> 16) & 0x1;
		this.cm = ((tz >> 17) & 0x1) ? -1 : 1; 
		this.ent = (tz >> 18) & 0x7;
		this.restMode = (tz >> 21) & 0x1;
		this.isPeopleBorn = (tz >> 22) & 0x1;
		this.isGMT = (tz >> 23) & 0x1;
		this.tzunk = (tz >> 24) & 0x1;
	}
	
	this.setTZ(btm);
	
	this.changeRestMode = function(){
		this.restMode = (this.restMode + 1) % 2;
	}
	
	this.setBornTimeMode = function (btm){
	}
	
	this.preCaptureTime = function(){
		var dobj = new Date();
		this.ct = dobj.getTime();
	}

	this.captureTime = function(){
		var oldcm = this.cm;
		this.preCaptureTime();

		if (this.ct > this.bornTime){
			this.cm = 1;
			this.ct = this.ct - this.bornTime;
		}
		else{
			this.cm = -1;
			this.ct = this.bornTime - this.ct;
		}
		this.ct += MCSTAMP0Y;
		if (oldcm != this.cm) {refreshText12(); prAr.touch('y_table'); prAr.end();}
		
		var dobj = new Date();
		var vt = prAr.get('y_table_vt');
		if (vt && prAr.get('y_table_vt') < dobj.getTime()) {prAr.set('y_table_vt', 0); prAr.touch('y_table'); prAr.end();}
	}
	
	this.setBornTimeAutoMode = function(t, tz, tzen, isGMT, tzunk){
		this.bornTime = t;
		this.tz = tz;
		this.tzen = tzen;
		this.preCaptureTime();
		if (this.ct > t) this.cm = 1;
		else this.cm = -1;
		this.isGMT = isGMT;
		this.tzunk = tzunk;
		this.refreshBS();
	}

	this.getMainValue = function(){
		return (hc_time_formats[this.format]).getMainValue(this.ct);
	}
	
	this.getMainMetric = function(t){
		return (hc_time_formats[this.format]).getMainMetric(t);
	}

	this.getSubText = function(){
		return (hc_time_formats[this.format]).getSubText(this.ct, this.restMode);
	}
	
	this.getYNum = function(t, offset){
		var res = t;
		var plusFunc = (this.cm > 0) ? getYNumPlus : getYNumMinus;
		var minusFunc = (this.cm > 0) ? getYNumMinus : getYNumPlus;
		res = plusFunc(t);
		if (offset > 0) for (var i = 0; i < offset; i++) res = plusFunc(res);
		else if (offset < 0) for (var i = 0; i < (-offset); i++) res = minusFunc(res);
		return res;
	}

	this.changeFormat = function(){
		this.format++;
		if (this.format > 7) this.format = 1;
	}
	
	this.getEventArray = function(offset, val){
		//offset - смещение результатов методом перебора
		var result = [];
		var min_fid = 0;
		var min_es = 0;
		this.captureTime();
		for (var i = 1 ; i < 8; i++){
			var it = {};
			it.ev = val ? val : this.getYNum((hc_time_formats[i]).getMainValue(this.ct), offset);
			it.em = (hc_time_formats[i]).getMainMetric(it.ev);
			var es = (hc_time_formats[i]).getStamp(it.ev, this.bornTime, this.cm);
			it.es = es;
			it.efid = i;
			if (it.ev && it.es < MCYTSTAMP_MAX && it.es > MCYTSTAMP_MIN){
				result.push(it);
				if (min_fid == 0 || es < min_es) {min_fid = i; min_es = es}
			}
		}
		result.push(min_fid);
		return result;
	}
	
	this.getDateStrEx = function(t, round, tz, isGMT){
		var rs = '';
		if (round) switch(this.ent){
			case 0: case 1: rs = '+24' + ' ' + tx.hourShort; break;
			case 2: rs = '+60' + ' ' + tx.minShort; break;
			case 3: rs = '+60' + ' ' + tx.secShort; break;
		}
		var mcd = new mc_date();
		mcd.tz = (this.tzen && !this.tzunk) ? tz : 0;
		mcd.setTime(t + mcd.tz * 1000);
		if (hc_lang === 'ru'){
			mcd.dm = (mcd.d + 1) + ' ' + hc_tmrp(mcd.m);
		}
		else{
			mcd.dm = hc_tmrp(mcd.m) + ' ' + (mcd.d + 1);
		}
		mcd.era = (mcd.y <= 0) ? tx.bc : tx.ad;
		mcd.knt = '';
		mcd.fts = hc_tn(mcd.h) + ':' + hc_tn(mcd.i) + ':' + hc_tn(mcd.s);
		switch(this.ent){
			case 2: mcd.knt =  hc_tn(mcd.h) + ' ' + tx.hourShort; break;
			case 3: mcd.knt =  hc_tn(mcd.h) + ':' + hc_tn(mcd.i); break;
			case 4: case 5: mcd.knt = mcd.fts; break;
		}
		
		mcd.kntz = (this.tzen && !this.tzunk) ? hc_get_tz_str(tz, isGMT) : '';
		mcd.knttz = mcd.knt + (mcd.kntz && mcd.knt && (tz != -hc_tz_val * 60) ? ' ' + mcd.kntz : '');
		mcd.y = Math.abs(mcd.y - ((mcd.y <= 0) ? 1 : 0));
		mcd.kny = mcd.y + ' ' + tx.yearShort + ((mcd.era) ? ' ' : '') + mcd.era;
		mcd.knywy = mcd.y + mcd.era;
		mcd.rs = (mcd.fts) ? ((rs ? ' ' : '') + rs) : '';
		mcd.timeExst = this.ent;
		mcd.fknttz = (tz == -hc_tz_val * 60) ? tx.current + ' ' + mcd.kntz : mcd.kntz;
		return mcd;
	}
	
	this.refreshBS = function(){
		this.bs = this.getDateStrEx(this.bornTime, false, this.tz, this.isGMT);
	}
	
	this.changeFormat = function(newFormat){
		if (!newFormat){
			var ea = this.getEventArray(0);
			this.format = ea.pop();
		}
		else{
			this.format = newFormat;
		}
	}
	
	this.refreshBS();
	this.changeFormat(this.format * 1);

	return this;
}

