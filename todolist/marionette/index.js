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

			'dependencies': [],
			'tags': [],

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

				var tags_ = [];
				tags.each(function (tag) {
					tags_.push(tag.get('name'));
				});
				this.model.set('tags', tags_);

				var deps_ = [];
				deps.each(function (task) {
					deps_.push(task.get('id'));
				});
				this.model.set('deps', deps_);

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

		'events': {
			'click .addtag': function () {
				var a = this.$('input');
				var b = new Tag({'name': a.val()});
				this.collection.add(b);
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

		'events': {
			'click .adddep': function ()
			{
				var task_id = this.$el.find('input').val();
				var task = tasks.get(task_id);
				if (!task)
				{
					alert('no such task!');
					return;
				}

				this.collection.add(task);
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

			tags = new Tags();
			_.each(this.model.get('tags'), function (tag) {
				tags.add({'name': tag});
			});
			this.tagsregion.show(new TaskTagsView({'collection': tags}));

			deps = new Tasks();
			_.each(this.model.get('deps'), function (task_id) {
				deps.add(tasks.get(task_id));
			});
			deps.listenTo(tasks, 'remove', function (task) {
				this.remove(task);
			});
			this.depsregion.show(new TaskDepsView({'collection': deps}));
		},

		'onBeforeClose': function () {
			// Remove this listener when no longer useful to prevent a
			// memory leak.
			deps.stopListening(tasks);
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
	// - Ne pas autoriser une tâche à être sa propre dépendance.
	// - Ne pas séparer le formulaire des listes de tâches et dépendances.
	//
	// - Ne créer une tâche qu'après avoir cliqué sur « enregister ».
}();
