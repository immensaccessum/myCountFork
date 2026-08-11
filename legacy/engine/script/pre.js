function rjsl_prop(){
	return this;
}

rjsl_prop.prototype.last_ref = -1;
rjsl_prop.prototype.av = 0;
rjsl_prop.prototype.get = function(){return this.av};
rjsl_prop.prototype.setF = function(v){this.av = v};
rjsl_prop.prototype.set = function(v){this.setF(v)};
rjsl_prop.prototype.ref = function(){};
rjsl_prop.prototype.preRef = function(){};

var prAr = {
	props : new Array(),
	_t_array : new Array(),
	add : function(name, get, set, ref, preRef){
		var ni = new rjsl_prop();
		if (get) ni.get = get;
		if (set) ni.setF = set;
		if (ref) ni.ref = ref;
		if (preRef) ni.preRef = preRef;
		prAr.props[name] = ni;
	},
	get : function(n){
		return prAr.props[n].get();
	},
	set : function(n, v){
		if (prAr.get(n) != v){
			prAr.props[n].set(v);
			prAr.touch(n);
		}
	},
	end : function(){
		var ppp, pr, ar, i, nxt, na, ca;
		do {
			nxt = false;
			na = [];
			ca = prAr._t_array;
			for(ppp in ca){
				if (ca[ppp]){
					pr = prAr.props[ppp]
					if (pr) ar = pr.preRef(pr);
					if (ar){
						for (i = ar.length - 1; i >= 0; i--){
							ca[ ar[i] ] = 0;
							na[ ar[i] ] = 1;
							nxt = true;
						}
					}
				}
			}
			for(ppp in ca){
				if (ca[ppp]){
					pr = prAr.props[ppp];
					if (pr) pr.ref(pr);
				}
			}
			prAr._t_array = na;
		}while(nxt);
		prAr._t_array = [];
		
		return false;
	},
	touch : function(n){
		prAr._t_array[n] = 1;
	},
	eset : function(n, v){
		prAr.set(n, v);
		return prAr.end();
	},
	einv : function(n, v){
		prAr.set(n, !prAr.get(n));
		return prAr.end();
	},
	etouch : function(n){
		prAr.touch(n);
		return prAr.end();
	},
	addInput : function(n, c){
		var p = prAr.props[n],
			nd = document.getElementById(n);
		if (!p){
			p = new rjsl_prop();
			prAr.props[n] = p;
		}
		if (p){
			p.get = function(){
				var y = document.getElementById(n);
				if (y) return y.value;
			};
			p.set = function(v){
				var y = document.getElementById(n);
				if (y) y.value = v;
			}
			p.preRef = function(){
				return [c];
			}
			if (nd){
				nd.onkeyup = function(){
					return prAr.etouch(n);
				}
				nd.onchange = function(){
					return prAr.etouch(n);
				}
			}
		}
	},
	getParObj : function(pre, ia){
		var i, r = {};
		for (i = ia.length - 1; i >= 0; i--){
			r[ia[i]] = prAr.get(pre + ia[i]);
		}
		return r;
	}
}

var MCGL = {
	enableEdit : function(n){
		var st = getStyleById(n);
		if (st){
			st.background = hc_input_en;
		}
	},
	disableEdit : function(n){
		var st = getStyleById(n);
		if (st){
			st.background = hc_input_dis;
		}
	},
	tinpmodAddEdit : function(n, d){
		prAr.addInput(n, d);
	},
	tinpmodEnProc : function(n){
		if (prAr.get(n + '_en')){
			MCGL.enableEdit(n);
			showById(n + '_close');
		}
		else {
			MCGL.disableEdit(n);
			setValueById(n, '0');
			hideById(n + '_close');
		}
	}
}

function buttonArray(id, start, end){
	this.buttonArray = new Array();
	this.val = '';
	this.selBgColor = '#FFFFBB';
	this.bgColor = '';
	this.add = function(id, start, end){
		if (end){
			for (var i = start; i <= end; i++){
				if (!this.buttonArray.length) this.val = id + i;
				this.buttonArray.push(id + i);
			}
		}
		else{
			if (!this.buttonArray.length) this.val = id;
			this.buttonArray.push(id);
		}
	}
	this.refreshStyle = function(){
		for (var ppp in this.buttonArray){
			if (ppp != this.val){
				var st = getStyleById(this.buttonArray[ppp]);
				if (st){
					st.color = '#808080';
					st.borderBottom = '';
				}
			}
		}
		if (this.val){
			var st = getStyleById(this.val);
			if (st){
				st.color = '#202020';
				st.borderBottom = '5px solid #606080';
			}
		}
	}
	this.add(id, start, end);
	return this;
}