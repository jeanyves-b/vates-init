!function () {
	'use strict';

	var app;
	var router;
	var tasks_list_view;
	var tasks;

	// Models & Collections.

	var task_id = 0;
	var Task = Backbone.Model.extend({
		'defaults': {
			'title': '',
			'creator': '',
			'description': '',

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

	var Tasks = Backbone.Collection.extend({
		'model': Task,
	});

	// Views.

	var TaskItemView = Backbone.Marionette.ItemView.extend({
		'template': '#tpl-task-item',
		'tagName': 'li',
		'events': {
			'click .delete-task' : function() //@todo click sur le boutton delete uniquement
			{
				tasks.remove(this.model);
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

	var TaskFormView = Backbone.Marionette.ItemView.extend({
		'template': '#tpl-task-form',
		'tagName': 'form',

		'events': {
			'submit' : function(event)
			{
				event.preventDefault();

				var attributes = {};
				_.each(this.$el.find(':input').serializeArray(), function (entry) {
					attributes[entry.name] = entry.value;
				});
				this.model.set(attributes);

				tasks.add(this.model);

				// Return to the tasks list.
				router.navigate('', {'trigger': true});
			},
		}
	});

	var TaskFullView = Backbone.Marionette.ItemView.extend({
		'template' : '#tpl-task-full',
		'tagname' : 'p'
	});

	// Router.

	var Router = Backbone.Router.extend({
		'routes': {
			'': function () {
				app.main.show(tasks_list_view);
			},
			'task/new': function () {
				app.main.show(new TaskFormView({'model': new Task()}));
			},
			'task/:id/edit': function (id) {
				var task = tasks.get(id);

				if (!task)
				{
					alert('no such task!');
					this.navigate('', {'trigger': true});
					return;
				}

				app.main.show(new TaskFormView({'model': task}));
			},
			'task/:id' : function (id) {
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

	// Application.

	app = new Backbone.Marionette.Application();
	app.addRegions({'main': '#main'});
	app.addInitializer(function () {
		tasks = new Tasks();
		tasks_list_view = new TasksListView({
			'collection': tasks,
		});

		router = new Router();
		Backbone.history.start();
	});

	$(function () {
		app.start();
	});

	// @todo:
	// - Afficher correctement les dates.
	// - Pouvoir cocher les cases dans la vue liste pour les marquer comme faites.
	// - Gérer les tags/dépendances.
	//
	// - Ne créer une tâche qu'après avoir cliqué sur « enregister ».
}();
