# vue-che
Vue.js directive-based validation plugin.
Supports context-specific (i.e. passengers list) validation.
# [Basic demo](http://htmlpreview.github.io/?https://github.com/mankey-ru/vue-che/blob/master/demo/index.html)

# Why not model-based?
Vuelidate is great enough, it just didn't exist when I needed a vue validator with context support. :)

Since now it exists, directive-based validation has only one significant advantage in my humble opinion: it's simple, therefore it's better when you have to create many forms (without need to edit a vue instances). 

It's simple because it doesn't require much code: only one directive to validate field; validation messages is built-in.