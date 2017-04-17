Vue.use(CHE, {lang: 'en'});
new Vue({
	el: '#vue-app',
	data: {
		mtext: '',
		mtext_confirm: '',
		mselect: '',
		mtextarea: '',
		mradio: null,
		mchbox: [],
		$che: {}
	},
	computed: {
		data: function() {
			return this.$data
		}
	},
	methods: {
		submitHandler: function() {
			var invalid = this.cheAll();
			if (invalid === false) {
				alert('Form is valid and ready to submit')
			}
		}
	}
});