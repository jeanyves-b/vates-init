!function () {
	'use strict';

	var app;
	var router;
	var tasks_list_view;
	var tasks;

	//////////////////////////////////
	// Models & Collections.
	//////////////////////////////////
	//--------------------------------
	// task model.
	//--------------------------------

	var Task;

	// @todo Remove.
	var deps;
	var tags;

	var Tag = Backbone.Model.extend({
		'defaults': {
			'name': '',
		},
	});
	var Tags = Backbone.Collection.extend({
		'model': Tag,
	});

	var Tasks = Backbone.Collection.extend({
		'model': Task,
	});

	var task_id = 0;
	Task = Backbone.Model.extend({
		'defaults': {
			'title': '',
			'creator': '',
			'description': '',
			'done': false,

			// @todo Use arrays.
			'dependencies': new Tasks(),
			'tags': new Tags(),

			// Unix timestamp.
			'ctime': 0,
			'mtime': 0,
		},

		'initialize': function () {
			var now = Date.now();

			this.set({
				'id': task_id++,

				'ctime': now,
				'mtime': now,
			});

			this.on('change', function () {
				this.set(
					{'mtime': Date.now()},
					{'silent': true}
				);
			});
		},
	});

	//////////////////////////////////
	// Views.
	//////////////////////////////////
	//--------------------------------
	// list view.
	//--------------------------------

	var TaskItemView = Backbone.Marionette.ItemView.extend({
		'template': '#tpl-task-item',
		'tagName': 'li',
		'initialize': function () {
			var self = this;
			this.model.on('change', function () {
				self.render();
			});
		},
		'events': {
			'click .delete-task': function ()
			{
				tasks.remove(this.model);
			},
			'click input': function ()
			{
				this.model.set('done', !this.model.get('done'));
			},
		}
	});

	var TasksListView = Backbone.Marionette.CompositeView.extend({
		'template': '#tpl-tasks-list',

		'itemView': TaskItemView,
		'itemViewContainer': 'ul',

		//we don't close the view in order to be able to redisplay it later
		'onBeforeClose': function () {
			return false;
		},
	});

	//--------------------------------
	// task detail views.
	//--------------------------------

	// @todo Maybe displays the tags.
	var TaskFullView = Backbone.Marionette.ItemView.extend({
		'template': '#tpl-task-full',
		'tagname': 'p',
		'templateHelpers': {
			//convertion timestamp->date
			'stamptodate': function(time)
			{
				var a = new Date(time);
				var out = a.toLocaleString();
				return out;
			}
		}
	});

	//--------------------------------
	// task edition views.
	//--------------------------------

	//form view
	var TaskFormView = Backbone.Marionette.ItemView.extend({
		'template': '#tpl-task-form',
		'tagName': 'form',

		'events': {
			'submit': function(event)
			{
				event.preventDefault();

				var attributes = {};
				_.each(this.$(':input').serializeArray(), function (entry) {
					attributes[entry.name] = entry.value;
				});
				this.model.set(attributes);

				tasks.add(this.model);

				// Return to the tasks list.
				router.navigate('', {'trigger': true});
			},
		}
	});

	//tag view
	var TaskTagView = Backbone.Marionette.ItemView.extend({
		'template': '#tpl-task-tag',
		'tagName': 'li',
		'initialize': function () {
			var self = this;
			this.model.on('change', function () {
				self.render();
			});
		},
		'events': {
			'click .delete': function () {
				tags.remove(this.model);
			},
		},
	});

	//tag list view
	var TaskTagsView = Backbone.Marionette.CompositeView.extend({
		'template': '#tpl-task-tags',

		'itemView': TaskTagView,
		'itemViewContainer': 'ol',

		'initialize': function () {
			tags = this.model;
		},

		'events': {
			'click .addtag': function ()
			{
				var a = this.$('input');
				var b = new Tag({'name': a});
				this.model.add(b);
				console.log(this.model);
			},
		}
	});

	//dependence view
	var TaskDepView = Backbone.Marionette.ItemView.extend({
		'template': '#tpl-task-dep',
		'tagName': 'li',
		'initialize': function () {
			var self = this;
			this.model.on('change', function () {
				self.render();
			});
		},
		'events': {
			'click .delete': function () {
				deps.remove(this.model);
			},
		},
	});

	//dependence list view
	var TaskDepsView = Backbone.Marionette.CompositeView.extend({
		'template': '#tpl-task-deps',

		'itemView': TaskDepView,
		'itemViewContainer': 'ol',

		'initialize': function () {
			deps = this.model;
		},

		'events': {
			'click .adddep': function ()
			{
				var a = this.$el.find('input');
				var b = new dep({'name': a});
				deps.add(b);
			},
		},
	});

	//global view
	var EditLayout = Backbone.Marionette.Layout.extend({
		'template': '#tpl-task-edit',
		'regions': {
			'formregion': '.form-region',
			'tagsregion': '.tags-region',
			'depsregion': '.deps-region',
		},

		'onDomRefresh': function () {
			this.formregion.show(new TaskFormView({'model': this.model}));
			this.tagsregion.show(new TaskTagsView({'model': this.model.get('tags')}));
			this.depsregion.show(new TaskDepsView({'model': this.model.get('deps')}));
		},
	});

	//////////////////////////////////
	// Router.
	//////////////////////////////////

	var Router = Backbone.Router.extend({
		'routes': {
			'': function () {
				app.main.show(tasks_list_view);
			},
			'task/new': function () {
				app.main.show(new EditLayout({'model': new Task()}));
			},
			'task/:id/edit': function (id) {
				var task = tasks.get(id);

				if (!task)
				{
					alert('no such task!');
					this.navigate('', {'trigger': true});
					return;
				}

				app.main.show(new EditLayout({'model': task}));
			},
			'task/:id': function (id) {
				var task = tasks.get(id);

				if (!task)
				{
					alert('no such task!');
					this.navigate('', {'trigger': true});
					return;
				}

				app.main.show(new TaskFullView({'model': task}));
			},
			'*path': function (path) { // Default route.
				alert('this page does not exist!');
				this.navigate('', {'trigger': true});
			},
		}
	});

	//////////////////////////////////
	// application.
	//////////////////////////////////

	app = new Backbone.Marionette.Application();
	app.addRegions({'main': '#main'});
	app.addInitializer(function () {
		tasks = new Tasks();
		tasks_list_view = new TasksListView({
			'collection': tasks,
		});

		router = new Router();
		Backbone.history.start();
		//tasks.add(new Task({title: "aaa"}));
	});

	$(function () {
		app.start();
	});

	// @todo:
	// - Gérer les tags/dépendances.
	//
	// - Ne créer une tâche qu'après avoir cliqué sur « enregister ».
}();
