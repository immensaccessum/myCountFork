MCGL.getDateInput = function(){
	var r = {};
}


var hcc = new hc_counter['default']();
hcc.canvasName = 'main_counter_canvas';
hcc.h = new hc_helper(hc_bornTime, hc_time_z, hc_event_fid);

var hc_metric_toggle = new buttonArray('mf_met_tog_', 1, 7);
var hc_time_precision = new buttonArray('mf_ctt_', 0, 5);
var hc_stmet_toggle = new buttonArray('mf_stmet_', 0, 8);
var hc_cnt_rm_toggle = new buttonArray('mf_cnt_rm_', 0, 1);

prAr.add('cnt_rm',
function(){return hcc.h.restMode},
function(v){hcc.h.restMode = v;},
function(){
	hc_cnt_rm_toggle.val = 'mf_cnt_rm_' + this.get();
	hc_cnt_rm_toggle.refreshStyle();
},
function(){return ['cnt_link'];}
);

prAr.add('cnt_link', null, null,
function(){
	var base = (window.location.origin || '') + hc_ind;
	var lv = base + '?wm=4&t=' + hcc.h.bornTime + '&tz=' + hcc.h.getTZ();
	lv += "&t1=" + encodeURIComponent(Base64.encode(getStrValueById('mf_cust_text1')));
	lv += "&t2=" + encodeURIComponent(Base64.encode(getStrValueById('mf_cust_text2')));
	var fid = hcc.h.format;
	lv += "&fid=" + fid;
	setValueById('mf_bat_label_area',lv);
	setHrefById('mf_bat_label_link',lv);
}
);

prAr.add('main_metric',
function(){return hcc.h.format},
function(v){hcc.h.format = v},
function(){
	if (hcc.h.format > 7) hcc.h.format = 1;
	hc_metric_toggle.val = 'mf_met_tog_' + hcc.h.format;
	hc_metric_toggle.refreshStyle();
	setInnerHTML('mf_stmet_8', 'текущая: ' + hcc.h.getMainMetric(null));
},
function(){
	return ['y_table', 'cnt_link'];
}
);

prAr.add('find_val',null,null,
function(){
	var v = getTestNumValueById('mf_find_val');
	getStyleById('mf_find_val').background = v.num ? hc_input_en : hc_input_dis;
	setSrcById('mf_find_val_img', hc_constimg_path + (v.num ? 'i/find_ok.png' : (v.val ? 'i/find_er.png' : 'i/find.png')));
	testNum('mf_find_val');
},
function(){return ['y_table'];}
);


function setYTableVal(i, bg, d, t, v){
	setBgColorById('mc_ytable_d_' + i, bg);
	setBgColorById('mc_ytable_t_' + i, bg);
	setBgColorById('mc_ytable_v_' + i, bg);
	setInnerHTML('mc_ytable_d_' + i, d);
	setInnerHTML('mc_ytable_t_' + i, t);
	setInnerHTML('mc_ytable_v_' + i, v);
}
prAr.add('y_table_vt',null,null,null,null);

prAr.add('y_table',null,null,
function(){
	var hc_event_array = [];
	var fv = getNumValueById('mf_find_val');
	if (!fv) fv = 0;
	hc_event_array = hcc.h.getEventArray(hc_event_offset, fv);
	var fid_obj = hc_event_array.pop();
	var len = hc_event_array.length;
	if (len > 1){
		for (var i = 0; i < len - 1; i++){
			var min_val = hc_event_array[i].es;
			var min_ind = i;
			for (var n = i + 1; n < len; n++){
				if (hc_event_array[n].es < min_val){
					min_val = hc_event_array[n].es;
					min_ind = n;
				}
			}
			var tmp = hc_event_array[i];
			hc_event_array[i] = hc_event_array[min_ind];
			hc_event_array[min_ind] = tmp;
		}
	}
	
	var minTime = 0;
	var tmpDate = new Date();
	var tz = tmpDate.getTimezoneOffset() * 60;
	for (var i = 0; i < hc_event_array.length; i++){
		if (!minTime || hc_event_array[i].es < minTime) minTime = hc_event_array[i].es;
		var bs = hcc.h.getDateStrEx(hc_event_array[i].es, true, -tz, 0);
		var bg = '';
		if (hc_event_array[i].efid * 1 == hcc.h.format * 1) bg = '#ffffff';
		setYTableVal(i, bg,
		bs.dm + tx.dateDel + bs.knywy,
		bs.fts + '<span class="mf_ytable_rs">' + bs.rs + '</span>',
		'<strong>' + hc_NumToStr(hc_event_array[i].ev) + '</strong> <a href="#" onclick="return prAr.eset(\'main_metric\',' + hc_event_array[i].efid + ')">' + hc_event_array[i].em + '</a>');
	}
	for (var i = hc_event_array.length; i < 7; i++) setYTableVal(i, 'none', '&nbsp;', '&nbsp;', '&nbsp;');
	if (fv) setInnerHTML('mf_yt_bbtm', '');
	else{
		var result = '<ul class="mc_but_line">';
		if (len == 0 && hc_event_offset <= 0) result += '<li><a href="#" onclick="return false;">&lt;</a></li>';
		else result += '<li><a href="#" onclick="return changeOffset(hc_event_offset - 1)">&lt;</a></li>';
		result += '<li><a href="#" onclick="return changeOffset(0)">0</a></li>';
		if (len == 0 && hc_event_offset >= 0) result += '<a href="#" onclick="return false;">&gt;</a></li>';
		else result += '<li><a href="#" onclick="return changeOffset(hc_event_offset + 1)">&gt;</a></li>';
		setInnerHTML('mf_yt_bbtm', result);
	}
	if (minTime){
		prAr.set('y_table_vt', minTime);
	}
	
},null
);


prAr.add('born_date',null,null,
function(){
	var obj;
	obj = prAr.getParObj('mf_ba_', ['h_en', 'min_en', 's_en']);
	hc_event_offset = 0;
	if (hc_vm == 3){	
		hcc.h.ent = 1;
		if(obj.h_en)  hcc.h.ent = 2;
		if(obj.min_en)  hcc.h.ent = 3;
		if(obj.s_en) hcc.h.ent = 4;
	
		var y = getNumValueById('mf_ba_y');
		var m = getNumValueById('mf_ba_m');
		var d = getNumValueById('mf_ba_d');
		var h = (hcc.h.ent > 1) ? getNumValueById('mf_ba_h') : 0;
		var min = (hcc.h.ent > 2) ? getNumValueById('mf_ba_min') : 0;
		var s = (hcc.h.ent > 3) ? getNumValueById('mf_ba_s') : 0;
		var tz = 0;
		var tzen = 1;
		var isGMT = 0;
		var tzunk = 0;
		switch(prAr.get('mf_ba_tz_mode')){
			case 1:
				tz = getValueById('mf_ba_tz');
				tz *= 60;
				break;
			case 2:
				tz = getNumValueById('mf_ba_gmt_h') * 3600 + getNumValueById('mf_ba_gmt_min') * 60 + getNumValueById('mf_ba_gmt_s');
				isGMT = 1;
				break;
			case 3:
				tz = 0;
				tzen = 0;
				break;
			case 4:
				tz = 0;
				tzunk = 1;
		}
		var dobj = new mc_date();
		dobj.setDate({y:y, m:m , d:(d-1), h:h, i:min, s:s});
		var new_bt = dobj.getTime() - tz * 1000;
		setBornTime(new_bt, tz, tzen, isGMT, tzunk);
		setInnerHTML('mf_ba_tz_disp', hcc.h.bs.fknttz);
	}
},
function(){
	return ['cnt_link', 'y_table'];
}
);

function refreshLinkView(){
	prAr.touch('cnt_link');
	prAr.end();
}

function refreshMetricToggle(){
	prAr.touch('main_metric');
	prAr.end();
}

prAr.add('count_settins_tgl',null,null,
function(){
	if (prAr.get('count_settins_tgl')){
		showById('counterSettingsPad');
		setInnerHTML('counterSettingsBut', '<a class="mf_mm_button"  href="#" onclick="return countSettingsToggle()">' + tx.hideSettings + '</a>');
	}
	else{
		hideById('counterSettingsPad');
		setInnerHTML('counterSettingsBut', '<a class="mf_mm_button"  href="#" onclick="return countSettingsToggle()">' + tx.adjustAndGetLink + '</a>');
	}
}, null
);

/////////////////////////////
function changeOffset(n){
	hc_event_offset = n;
	prAr.touch('y_table');
	return prAr.end();
}

/////////////////////////

function testNum(id){
	var v = getValueById(id);
	var brd = '';
	var res = !(isNaN(parseFloat(v))) || !v;
	if (!res) brd = '2px solid #F01010';
	var st = getStyleById(id);
	if (st) st.border = brd;
	return res;
}

function hccDraw(){
	if (hcc.ready){
		var mcd;
		var d1 = new Date();
		d1 = d1.getTime();
		hcc.h.captureTime();
		var mainValue = hcc.h.getMainValue();
		hcc.mv = mainValue;
		var mainMetric = hcc.h.getMainMetric((hcc.h.format == 1) ? 0 : mainValue);
		if (hc_vm == 6){
			mcd = new mc_date();
			mcd.setTime(d1);
			hcc.mv = mcd.d + 1;
		}
		
		var subText_x = hcc.draw();
		var subText;
		if (hc_vm == 6){
			subText = '<strong>' + 'c ' + hcc.mv + ' ' +  hc_tmrp(mcd.m) + '</strong></br>' + mcd.y;
		}
		else{
			subText = '<strong>' + mainMetric + '</strong></br>' + hcc.h.getSubText();
		}
		setInnerHTML('mf_sec_text', subText);
		getStyleById('mf_sec_text').left = (subText_x.x + 20 + hc_sub_text_shift) + 'px';
		getStyleById('mf_sec_text').top = (-hc_count_h) + 'px';
	}
	setTimeout(function () {hccDraw();}, 30);
}

function countSettingsToggle(){
	var tmpVal = prAr.get('count_settins_tgl');
	prAr.set('count_settins_tgl', !tmpVal);
	return prAr.end();
}


function refreshText12(){
	var preText = tx.dateOn;
	var postText = tx.dateWas;
	if (hcc.h.cm < 0){
		preText = tx.dateUntil;
		postText = tx.dateLeft;
	}
	
	var bs = hcc.h.bs;
	var dt = preText + bs.dm + tx.dateDel + bs.kny;
	dt +=  ' ' + bs.knttz;
	dt+= postText;
	switch(hc_vm){
		case 1: case 4:
			setInnerHTML('mf_text1', (hc_text1) ? hc_text1 : dt);
			setInnerHTML('mf_text2', hc_text2);
			
			setInnerHTML('mb_ba_dy', bs.y + '<span class="mc_info_era"> ' + bs.era + '</era>');
			setInnerHTML('mb_ba_dd', bs.dm);
			setInnerHTML('mb_ba_dt', bs.knttz);
			break;
		case 3:
			prAr.touch('mf_ba_tz_tgl');
			var cust_t1 = getStrValueById('mf_cust_text1');
			if (cust_t1) setInnerHTML('mf_text1', cust_t1);
			else{
				setInnerHTML('mf_text1', dt);
				setPlaceholderById('mf_cust_text1', dt);
			}
			var cust_t2 = getValueById('mf_cust_text2');
			setInnerHTML('mf_text2', cust_t2);
	}
}

function setBornTime(t, tz, tzen, isGMT, tzunk){
	hcc.h.setBornTimeAutoMode(t, tz, tzen, isGMT, tzunk);
	refreshText12();
	prAr.touch('cnt_link');
	hcc.draw();
	prAr.touch('y_table');
}

function changeTimeToggleFrom(tt, ds){
	if (ds) hcc.h.ent = tt;
	else hcc.h.ent = Math.max(hcc.h.ent, tt);
	prAr.touch('born_date');
	return prAr.end();
}

function refreshEventTable(){
	prAr.touch('y_table');
}

function setVM(new_vm){
	hc_vm = new_vm;
	
	switch(hc_vm){
		case 1:
			if (typeof MC_loadPresetEvent === 'function') {
				MC_loadPresetEvent(hc_event_wid || 1);
			}
			refreshText12();
			break;
		case 3:
			setValueById('mf_ba_tz_cur', -hc_tz_val);
			setInnerHTML('mf_ba_tz_cur', tx.current + ' ' + hc_get_tz_str(-hc_tz_val * 60));
			setValueById('mf_ba_m', 2);
			//cahngeBornDateEvent();
			prAr.touch('born_date');
			
			refreshText12();
			changeTimeToggleFrom(1, true);
			refreshLinkView();
			break;
		case 4:
			refreshText12();
			if (hc_text1) setInnerHTML('mf_text1', hc_text1);
			if (hc_text2) setInnerHTML('mf_text2', hc_text2);
			break;
	}
	
	if (typeof MC_applyViewMode === 'function') MC_applyViewMode(hc_vm);
	return hc_event_result;
}

var dBg = {
	canvas : null,
	c : null,
	needRepaint : true,
	patImg : null,
	init : function(){
		dBg.needRepaint = true;
		dBg.canvas = document.getElementById("mf_bg_canvas");
		dBg.canvas.width = document.body.clientWidth;
		dBg.canvas.height = document.body.clientHeight;
		dBg.c = dBg.canvas.getContext("2d");
		dBg.drawBg();

	},
	drawBg : function(){
		var w = dBg.canvas.width;
		var h = dBg.canvas.height;
		var c = dBg.c;
		c.save();
		var grsw = 3500;
		var ofs = (w - grsw)/2;
		var grd = c.createLinearGradient(0 + ofs, 0, grsw + ofs, 0);

		grd.addColorStop(0, 'rgb(0, 0, 0)');
		grd.addColorStop(0.4, 'rgb(245, 245, 245)');
		grd.addColorStop(0.6, 'rgb(245, 245, 245)');
		grd.addColorStop(1, 'rgb(0, 0, 0)');	
		
		c.fillStyle = grd;
		c.fillRect(0, 0, w, h);
		
		c.restore();
	}
}

function loadSocialButtons(){
	// Social widgets removed from the fork — original site used VK/Facebook/Google+.
}

function disableAd(){
	var expires = new Date();
	expires.setTime(expires.getTime() + 604800000);
	document.cookie = "mycount_disable_ad = 1; expires=" + expires.toGMTString() + "; path=/; domain=mycount.org;";
	hideById('mf_google_ad');
	return hc_event_result;
}

function parseUrlParams(){
	var search = window.location.search;
	if (!search || search.length < 2) return;
	var params = {};
	search.slice(1).split('&').forEach(function(pair){
		var parts = pair.split('=');
		if (parts[0]) params[decodeURIComponent(parts[0])] = decodeURIComponent(parts[1] || '');
	});
	if (params.wm) hc_vm = parseInt(params.wm, 10) || hc_vm;
	if (params.t) hc_bornTime = parseInt(params.t, 10) || hc_bornTime;
	if (params.tz !== undefined && params.tz !== '') hc_time_z = parseInt(params.tz, 10) || 0;
	if (params.fid) hc_event_fid = parseInt(params.fid, 10) || hc_event_fid;
	if (params.t1) hc_text1 = Base64.decode(params.t1);
	if (params.t2) hc_text2 = Base64.decode(params.t2);
	if (params.wid) hc_event_wid = parseInt(params.wid, 10) || 1;
}

window.onload = function () {
	parseUrlParams();
	setInnerHTML('mf_sec_text', tx.loading);
	updCountObj();
	
	viewById ('main_metric_ul', mcInVar.enMainMetric);
	
	var bgi = '';
	if (hc_count_obj['bgi']) bgi = 'url(' + hc_constimg_path + 'cb/' + hc_count_obj['bgi'] + ') bottom left ';
	
	setBgColorById('mf_c_area', bgi + hc_count_obj['bgc']);
	
	setColorById('mf_text1', hc_count_obj['tc']);
	setColorById('mf_text2', hc_count_obj['tc']);
	setColorById('mf_sec_text', hc_count_obj['tc']);
	hc_metric_toggle.color = hc_count_obj['tc'];
	hc_metric_toggle.shadow = hc_count_obj['bshadow'];
	hcc.init();
	dBg.init();
	var canvas = document.getElementById("main_counter_canvas");
	hcc.c = canvas.getContext("2d");
	
	refreshEventTable();
	refreshMetricToggle();
	
	setVM(hc_vm);
	if (typeof MC_UI_init === 'function') MC_UI_init(window.MC_STRINGS || {});
	
	hccDraw();
	
	prAr.set('mf_ba_tz_mode', 1);
	prAr.touch('mf_ba_tz_tgl');
	prAr.set('mf_ba_tz_tgl', 0);
	prAr.touch('mf_ba_h_en');
	prAr.touch('mf_ba_min_en');
	prAr.touch('mf_ba_s_en');
	prAr.touch('cnt_rm');
	prAr.touch('count_settins_tgl');
	
	return prAr.end();
}

window.onresize = function () {
	dBg.init();
	if (typeof MC_UI !== 'undefined' && MC_UI.resizeCounter) MC_UI.resizeCounter();
}