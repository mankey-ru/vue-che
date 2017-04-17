/**
	Directive-based (not model-based) validation plugin.

	Basic usage:
	<input v-model="mytext" v-che:mytext.reqd />

	Note: due to attribute lowercaseness arg of v-che could be any case, 
	i.e.: v-che:mYTEXT will also work correctly - if there are no collisions in other prop names, of course.
	Collision names is myProp and myprop. Its weird anyway :)

	Аргументы глобального метода che:
		1. Имя поля в апперкейзе (почему - см. в комментариях в коде плагина)
		2. Имя метода валидации из cheMethodsLib
		3. [опционально] Объект, в который будут записаны результаты валидации
	Пример использования:
		<span class="che-err" v-html="che('FIRSTNAME','reqd', pass)">
			[здесь выведется текст, который указан в cheMethods]
		</span>
		<span class="che-err" v-if="che('FIRSTNAME','reqd', pass)">
			Поле обязательное и это кастомный текст, отличный от указанного в cheMethods
		</span>
		<input v-model="pass.firstName" v-che:FIRSTNAME.reqd.letters="pass" />
	т.е. в тексте ошибки можно вывести стандартный текст, который возвращает метод валидации, а можно - кастомный (через v-if или v-show). Соответственно, если метод возвращает булево значение, текст можно использовать только кастомный
*/

(function(root, factory) { // credits for wrapper: https://github.com/umdjs/umd
	var globalName = 'CHE'
	if (typeof define === 'function' && define.amd) {
		// AMD. Register as an anonymous module.
		define([], factory);
	}
	else if (typeof module === 'object' && module.exports) {
		// Node. Does not work with strict CommonJS, but
		// only CommonJS-like environments that support module.exports,
		// like Node.
		module.exports = factory();
	}
	else {
		// Browser globals (root is window)
		root[globalName] = factory();
	}
}(this, function() {



	return new function() {
		var serviceKeysToIgnore = ['Shift', 'Tab', 'Control', 'Command', 'Meta', 'ContextMenu'];
		var invFieldPropName = '$err';
		var errInpClass = 'che-err-inp';
		var cheData = {
			inputs: {
				$all: []
			}
		};
		var _this = this;
		var cheMethodsLib = {
			/**
			    Each validation method has following arguments:
			    * mval		- current model value
			    * context	- could be either global $data or its subproperty (i.e. array element)
			    * extras	- object:
			    *	extras.param      ....TODO
			*/
			reqd: function(mval, context, extras) {
				// можно передать отдельное условие, при котором поле будет считаться обязательным
				// v-che:PLGENDER.reqd="{$context: tr, condition: tr._xtra_gender_required}"
				// соответственно если передать тупо контекст
				// v-che:PLGENDER.reqd="tr" 
				// то поле будет обязательным всегда
				var hasExtraCondition = extras.param && typeof extras.param.condition !== 'undefined';
				var extraCondition = hasExtraCondition ? extras.param.condition : true;
				var mvalFalsey = !mval || !mval.length; // made for empty arrays (multiple checkboxes)
				return mvalFalsey && extraCondition ? MSG.reqd : false;
			},
			f_date_ru: function(mval) {
				return !mval || /^\d{2}\.\d{2}\.\d{4}$/.test(mval) ? false : MSG.f_date_ru;
			},
			f_email: function(mval) {
				// RFC 2822 Section 3.4.1 is too much, so this simple regex is enough I guess
				return !mval || /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(mval) ? false : MSG.f_email;
			},
			// Basic setup: <input v-model="mtext_confirm" v-che:MTEXT_CONFIRM.sameas="{propname:'mtext'}" />
			sameas: function(mval, context, extras) {
				return mval === context[extras.param.propname] ? false : MSG.sameas;
			}
		}

		var MSG;
		var customEventsLib = {};

		this.install = function(Vue, options) {
			MSG = l10n[options.lang] || 'en';
			if (!l10n[options.lang]) {
				console.error('Vue-che error: language «' + options.lang + '» not found. Default is EN.');
			}
			Vue.directive('che', {
				bind: function(el, binding, vnode) {
					var cheMethods = binding.modifiers;
					var fieldName = binding.arg.toUpperCase(); // привожу к апперкейзу чтобы не было ошибок именами пропертей с разным регистром. Дело в том что хтмл-атрибуты всегда lowercase, поэтому модификатор директивы v-che.myMod в коде будет mymod, а я делаю их апперкейзом для очевидности, что они отличаются (проглядеть кемелкейз легко)
					var $inp = el;
					var contextIsGlobal = typeof binding.value === 'undefined' || typeof binding.value.$context === 'undefined';
					var context; // куда класть объект состояния валидации ($che).
					if (contextIsGlobal) {
						context = vnode.context.$data; // Если в значение атрибута директивы пусто (che:xx.yy=""), берётся глобальная data
					}
					else if (binding.value.$context) {
						context = binding.value.$context; // можно передать объект с доп. параметрами для метода валидации
						// v-che:FIELDNAME.reqd="{$context: tr, condition: tr.fieldNameRequired}"
					}
					else {
						context = binding.value;
					}

					// сохраняем инпуты в двух коллекциях: первая тупо плоский список, вторая - разбита по полям. Дальше будет ещё третья - уже внутри контекстя, чтобы можно было дёрнуть конкретное поле конкретного пассажира.
					cheData.inputs.$all.push($inp);
					cheData.inputs[fieldName] = cheData.inputs[fieldName] || [];
					cheData.inputs[fieldName].push($inp);

					if (contextIsGlobal && !context.$che) {
						console.error('Значение атрибута директивы валидации пустое (che:xx.yy=""). \nЭто означает, что состояние валидации (объект $che) будет храниться в корневом объекте data, но для этого придётся добавить $che:{} к нему на этапе инициализации. \nСделать это динамически скрипт не сможет, потому что Vue does not allow dynamically adding new root-level reactive properties to an already created instance. \nНу или передать вложенный объект (например, элемент массива) и хранить состояние [его] валидации в нём самом, тогда это сделает сам скрипт.')
						return
					}
					if (!contextIsGlobal) { // Во время биндинга устанавливаются вложенные проперти валидации, приаттаченные к целевому объекту в data
						Vue.set(context, '$che', context.$che || {})
					}

					Vue.set(context.$che, fieldName, context.$che[fieldName] || {})
					Vue.set(context.$che[fieldName], invFieldPropName, false) // (false === ошибки нет)
					context.$che[fieldName].$input = $inp; // чтобы можно было дёрнуть конкретное поле конкретного пассажира, см. cheTrigger

					for (var cheMethodName in cheMethods) {
						Vue.set(context.$che[fieldName], cheMethodName, false) // (false === ошибки нет)
					}
					// Можно дёрнуть конкретную проверку конкретного инпута, см. cheTrigger
					var specificEvents = '';
					for (var cheMethodName in cheMethods) {
						specificEvents += ' cheSpecific.' + cheMethodName;
					}
					var basicEvent = $inp.tagName === 'SELECT' ? 'change' : 'input';
					var customEventsStr = ' cheAll' + specificEvents; // TODO DO IT ONCE!!
					_createEventMulti(customEventsStr)
					_addListenerMulti($inp, basicEvent + customEventsStr, function(evt) { // 'change' needed?
						if (serviceKeysToIgnore.indexOf(evt.key) !== -1) {
							return
						}
						var modelValue;
						// значение беру из модели, а не из DOM value. Исхожу из предположения, что дешевле пройтись по свойствам targetObj в апперкейзе и найти нужное
						for (var propName in context) {
							if (propName.toUpperCase() === fieldName) {
								modelValue = context[propName];
								break;
							}
						}

						var bSpecificEvent = evt.type === 'cheSpecific';
						var inputHasError = false;
						for (var cheMethodName in cheMethods) {
							if (bSpecificEvent && evt.namespace !== cheMethodName) {
								continue; // типа, дёрнута конкретная проверка и текущий метод - не тот, который дёрнули
							}
							if (typeof cheMethodsLib[cheMethodName] === 'function') {
								var extras = { // упаковал доп. аргументы в объект
									$inp: $inp,
									$data: vnode.context.$data,
									fieldName: fieldName,
									evt: evt,
									param: binding.value // здесь могут быть доп. параметры, CTRL+F "$context"
								}
								var errText = cheMethodsLib[cheMethodName](modelValue, context, extras);
								/**
								    в метод валидации передаются аргументы mval, context, extras:
								    1. значение текущего поля (если переданный директивой fieldname есть в переданном директивой контексте)
								    2. контекст (передан директивой как значение v-атрибута)

								    3. жиквери-объект инпута
								    4. глобальная data текущего экземпляра vue
								    5. название поля (fieldname, передан директивой как кусок названия атрибута который идёт после двоеточия)
								    6. событие
								*/
								context.$che[fieldName][cheMethodName] = errText;
								if (!!errText) {
									inputHasError = true;
									break // доходим до первой ошибки и ОК
								}

							}
							else {
								var availableMeth = Object.keys(cheMethodsLib).filter(function(k) {
									return typeof cheMethodsLib[k] === 'function'
								}).join(', ');
								console.error('vue-che: Not found validation method with name «' + cheMethodName + '».\nAvailable methods: ' + availableMeth)
							}
						}

						// Vue.set(context.$che[fieldName], invFieldPropName, false);
						// Следим за содержимым поля с ошибкой валидации
						// Если оно меняется (т.е. поле становится валидным или инвалидным), то проставляется статус
						/*
						закомментировал потому что если сначала ввести валидные символы, а затем невалидные то класс не навешивается
						if (!inputWatch) {
						    inputWatch = vnode.context.$watch(function () {
						        return context.$che[fieldName][invFieldPropName] // текст ошибки
						    }, function () {
						        //console.log('$watch args:', arguments)
						        console.log('Field validation status changed! ' + fieldName);
						        console.log($inp)
						        $inp.toggleClass(errInpClass, inputHasError)
						    })
						}*/
						_toggleClass($inp, errInpClass, inputHasError)
					});
					//console.log(binding.arg) // это то что после двоеточия
					//console.log(binding.modifiers) // это то что после точек
				}
			});
			Vue.mixin({
				// функции - чтобы проверка была безопасной, т.е.
				// не вызывала ошибки рендеринга, как это было с прямой 
				// проверкой проперти v-if="pass.FIELDNAME.validationMethod"
				methods: {
					/**
						Getting error text (if any) of particular model prop.
						Args:
						* fieldName	- model prop name
						* context	- optional. Default context is global $data
						Basic usage:
						* <span v-html="cheErr('LASTNAME')" />

					*/
					cheErr: function(fieldName, context) { // проверка, валидно ли поле
						fieldName = fieldName.toUpperCase(); // string expected
						context = context || this.$data;
						time('cheErr')
						if (context.$che && context.$che[fieldName]) {
							for (var validationMethod in context.$che[fieldName]) {
								var errText = context.$che[fieldName][validationMethod];
								if (!!errText && validationMethod.charAt(0) !== '$') {
									// проверка на $ чтобы можно было иметь not enumerable служебные свойства
									context.$che[fieldName][invFieldPropName] = errText;
									return errText
								}
							}
							context.$che[fieldName][invFieldPropName] = '';
							time('cheErr', 1)
							return '';
						}
						else {
							return '';
						}
					},
					// Проверка тупо всех инпутов. TODO подумать, как сделать оптимальнее.
					cheAll: function() {
						time('cheAll');
						for (var i = 0; i < cheData.inputs.$all.length; i++) {
							cheData.inputs.$all[i].dispatchEvent(customEventsLib.cheAll)
						}
						var $firstErrInp = document.querySelector('.' + errInpClass);
						var bInvalid = $firstErrInp !== null; // $firstErrInp instanceof HTMLElement
						if (bInvalid) {
							$firstErrInp.focus();
						}
						if (this.$data.$che) {
							this.$data.$che.$che_all_invalid = bInvalid;
						}
						time('cheAll', 1);
						return bInvalid
					},
					// Валидация контекста (проверка, есть ли у него не прошедшие валидацию поля)
					// пример использования:
					// <span class="cheContex" v-html="cheMeth(pass)">
					// У этого пассажира не проходит валидацию какое-то поле (данная ошибка выводится при наличии)</span>
					cheContext: function(context) { // проверка, валиден ли контекст целиком
						time('cheContext');
						var bInvalid = false;
						for (var fieldName in context.$che) {
							for (var validationMethod in context.$che[fieldName]) {
								if (!!context.$che[fieldName][validationMethod]) {
									// console.log(fieldName, validationMethod, context.$che[fieldName][validationMethod])
									bInvalid = true;
									break
								}
							}
						}
						context.$che_context_invalid = bInvalid;
						time('cheContext', true);
						return bInvalid;
					},
					// Получить результат валидации конкретного метода конкретного поля
					// Отличие от cheTrigger в том что данный метод не дёргает саму валидацию, а лишь получает ранее вычисленный результат
					// пример использования:
					// <span class="che-err" v-html="cheMeth('LASTNAME','reqd', pass)">У этого пассажира не проходит валидацию методом reqd поле с названием lastname (данная ошибка выводится при наличии)</span>
					cheMeth: function(fieldName, validationMethod, context) {
						context = context || this; // если передан вложенный объект, признаки валидации будут устанавливаться ему. Если нет - используется глобальная data
						var fieldValidationProps = context.$che ? context.$che[fieldName] : false;
						if (!!fieldValidationProps && !!fieldValidationProps[validationMethod]) {
							return fieldValidationProps[validationMethod];
						}
						else {
							return ''
						}
					},
					/**
					    Дёрнуть валидацию конкретного метода конкретного поля.
					    Полезно при зависимых проверках: например, при изменении типа документа надо проверить ФИО, т.к. оно может содержать латиницу если выбран загран.
					    fieldNames          String. Имена полей в апперкейзе. Разделитель - пробел.
					    validationMethod    String. Optional. Имя проверки (например, fio) если нужно 
					                        вызвать только её, либо false|undefined|null и т.п., 
					                        если нужно вызвать все проверки поля.
					    context             Vue object. Optional. Контекст может быть передан, если нет то                      берётся глобальная $data.

					*/
					cheTrigger: function(fieldNames, validationMethod, context) {
						var context = context || this;
						var fieldsArray = fieldNames.split(' ');
						for (var i = 0; i < fieldsArray.length; i++) {
							var fieldName = fieldsArray[i];
							if (context.$che[fieldName]) {
								var eventName = !!validationMethod ? 'cheSpecific.' + validationMethod : 'cheAll';
								context.$che[fieldName].$input.trigger(eventName);
							}
						}
					},
					/** Получить результат валидации конкретного поля
					Отличие от cheTrigger в том что данный метод не дёргает саму валидацию, а лишь получает ранее вычисленный результат
					пример использования:
					    <span class="che-err" v-html="cheField('LASTNAME', pass)">У этого пассажира не проходит валидацию поле с названием lastname (данная ошибка выводится при наличии)</span>
					или                             
					    <input v-bind:class="{'che-err-inp':cheField('LASTNAME', pass)}"/>
					    У этого инпута будет присвоен класс только если для этого поля есть ошибка
					    Нужен для случаев типа PIRS-13861
					*/
					cheField: function(fieldNames, context) {
						var context = context || this;
						var fieldsArray = fieldNames.split(' ');
						for (var i = 0; i < fieldsArray.length; i++) {
							var fieldName = fieldsArray[i];
							if (!!context.$che.$inputHasError) {
								return true
							}
						}
						return false
					}
				}
			});
		}

		// profiling
		function time(label, bEnd) {
			if (window.location.href.indexOf('_che-profile_') !== -1) {
				if (bEnd) {
					console.timeEnd(label)
				}
				else {
					console.time(label)
				}
			}
		}

		function _createEventMulti(evtNames) {
			evtNames.split(' ').forEach(function(evtName) {
				customEventsLib[evtName] = new CustomEvent(evtName)
			});
		}

		function _addListenerMulti(el, s, fn) {
			s.split(' ').forEach(e => el.addEventListener(e, fn, false));
		}
		// TODO перенести в либу (убрать из vue-router)
		function _toggleClass(el, theClass, boo) { // classList.toggle second argument support isnt good so...
			var hasClass = el.className.indexOf(theClass) !== -1;
			var conditionToRemove = typeof boo === 'undefined' ? hasClass : hasClass && !boo;
			var conditionToAdd = typeof boo === 'undefined' ? !hasClass : !hasClass && boo;
			if (conditionToRemove) {
				el.className = el.className.split(theClass).join('')
			}
			else if (conditionToAdd) {
				el.className += ' ' + theClass;
			}
		};
		var l10n = {
			en: {
				reqd: 'Field is required',
				f_date_ru: 'Формат даты - дд.мм.гггг',
				f_email: 'Incorrect email format',
				sameas: 'Values do not match'
			},
			ru: {
				reqd: 'Поле обязательное',
				f_date_ru: 'Формат даты - дд.мм.гггг',
				f_email: 'Формат адреса e-mail некорректный',
				sameas: 'Значения не совпадают'
			}
		}

		this.methods = cheMethodsLib;
		this.data = cheData;
		this.l10n = l10n;
	};



}));