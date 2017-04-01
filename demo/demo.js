Vue.use(CHE)
new Vue({
	el: '#vue-app',
	data: {
		mtext: '',
		mselect: null,
		mtextarea: '',
		mradio: null,
		mchbox: [],
		$che: {

		}
	},
	computed: {
		data: function(){
			return this.$data
		}
	}
})
/*var inp = document.querySelectorAll('.tt');
for (var i = 0; i < inp.length; i++) {
	addListenerMulti(inp[i], 'input change', function (evt) {
		console.log(evt.type, evt.target.tagName, evt.target.type)
	})
}
function addListenerMulti(el, s, fn) {
	s.split(' ').forEach(e => el.addEventListener(e, fn, false));
}*/