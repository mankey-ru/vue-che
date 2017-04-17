vue-che ([basic demo](http://htmlpreview.github.io/?https://github.com/mankey-ru/vue-che/blob/master/demo/index.html))
======
Vue.js directive-based validation plugin.
Supports context-specific (i.e. passengers list) validation.

Installation
======
Plugin can be used either as required module, or es2015 import, or old-fashioned script tag with global var
```javascript
import VueChe from 'vue-che'
Vue.use(VueChe, { // second argument is optional
	errorClass: 'has-error',
	lang: 'ru'
})
```
Essential example (required input)
======
```html
<input v-model="mystring" v-che:MYSTRING.reqd />
<span v-html="cheErr('MYSTRING')"><!-- Here comes a default error text --></span>
```


Why not model-based?
======
Vuelidate is great enough, it just didn't exist when I needed a vue validator _with context support_. :)

Since now it exists, directive-based validation has only one significant advantage in my humble opinion: it's simple, therefore it's better when you have to create many forms (without need to edit a vue instances). 

It's simple because it doesn't require much code: only one directive to validate field; validation messages is built-in.