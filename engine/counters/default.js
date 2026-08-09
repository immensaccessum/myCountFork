var hc_img_digit = function(){
	this.value = 0;
	this.setValue = 0;
	this.px = 0;
	this.py = 0;
	this.setPx = 0;
	this.setPy = 0;
	this.sx = 0;
	this.sy = 0;
	this.setSx = 1;
	this.setSy = 1;
	this.cm = 1;
	
	this.draw = function(c, tex, sc){
		w = hc_count_obj['w'];
		h = hc_count_obj['h'];
		c.drawImage(tex, 0, Math.abs(this.value % 10) * h, w, h, this.px * sc, this.py * sc, w * this.sx * sc, h * this.sy * sc);
	}
	
	this.valAnimate = function(v, s, min){
		var res = 0;
		var d = s - v;
		if (Math.abs(d) < min) res = s;
		else res = v + d * 0.25;
		return res;
	}
	
	this.animate = function(){
		this.px = this.valAnimate(this.px, this.setPx, 1);
		this.py = this.valAnimate(this.py, this.setPy, 1);
		this.sx = this.valAnimate(this.sx, this.setSx, .05);
		this.sy = this.valAnimate(this.sy, this.setSy, .05);
		this.setValue = Math.abs(this.setValue % 10);
		this.value = Math.abs(this.value % 10);
		if (this.value != this.setValue){
			this.value += this.cm;
			if (this.value < 0) this.value = 9;
			else if (this.value > 10) this.value = 0;
		}
	}
	return this;
}

hc_counter['default'] = function (){
	this.canvasName = '';
	this.h = null;
	this.c = null;
	this.d = new Array();
	this.mv = 0;
	this.dig_count = 12;
	this.tex = null;
	this.ready = false;
	
	this.init = function(){
		updCountObj();
		this.tex = new Image();
		this.tex.src = hc_constimg_path + 'c/' + hc_count_obj['tex'];
		this.tex.onload = function(){hcc.ready = true;};
		
		for (var i = 0; i < this.dig_count; i++){
			this.d[i] = new hc_img_digit();
			this.d[i].setPy = (this.dig_count - i) * 30;
		}
	}
	
	this.draw = function(){
		if (this.ready){
		this.c.save();
		this.c.clearRect(0, 0, mcInVar.cnt_w, mcInVar.cnt_h);
		
		for (var i = 0; i < this.dig_count; i++){
			this.d[i].setValue = 0;
			this.d[i].setSx = 0;
			this.d[i].setSy = 0;
			this.d[i].cm = this.h.cm;
		}
		
		var mv_text = this.mv + '';
		var mv_text_len = mv_text.length;
		var sc = 1;
		
		if (this.mv * 1 < 1000000000000){
			for (var i = 0; i < mv_text_len; i++){
				var ind = i + this.dig_count - mv_text_len;
				this.d[ind].setValue = mv_text.charAt(i);
				this.d[ind].setSx = sc;
				this.d[ind].setSy = sc;
				this.d[ind].setPy = 0;
			}
		}
		else{
			mv_text_len = this.dig_count;
			for (var i = 0; i < this.dig_count; i++){
				this.d[i].setValue = 9;
				this.d[i].setSx = sc;
				this.d[i].setSy = sc;
				this.d[i].setPy = 0;
			}
		}
		
		var x_offset = (this.dig_count - mv_text_len) * (-hc_count_obj['spac']);
		var sc = this.dig_count * hc_count_obj['spac'] + x_offset + Math.floor(this.dig_count/3) * 25;
		if (sc < 600) sc = 1;
		else sc = 600/sc;
		for (var i = 0; i < this.dig_count; i++){
			this.d[i].setPx = i * hc_count_obj['spac'] + x_offset + Math.floor(i/3) * 25;
			this.d[i].animate();
			this.d[i].draw(this.c, this.tex, sc);
		}
		this.c.restore();
		return {x :(this.d[this.dig_count - 1].px + hc_count_obj['spac']) * sc, y : hc_count_obj['h'] * (1 - sc)};
		}
		return 0;
	}
	return this;
}