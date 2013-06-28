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
	});

	var TasksListView = Backbone.Marionette.CompositeView.extend({
		'template': '#tpl-tasks-list',

		'itemView': TaskItemView,
		'itemViewContainer': 'ul',
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

	// Router.

	var Router = Backbone.Router.extend({
		'routes': {
			'': function () {
				app.main.show(tasks_list_view);
			},
			'task/:id': function (id) {
				// @todo Creates a task only when the form is saved.
				var task = ('new' === id)
					? new Task()
					: tasks.get(id);

				if (!task)
				{
					alert('no such task!');
					this.navigate('', {'trigger': true});
					return;
				}

				app.main.show(new TaskFormView({'model': task}));
			},
			'*path': function (path) { // Default route.
				alert('this page does not exist!');
				this.navigate('', {'trigger': true});
			}
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
	// - Ne créer une tâche qu'après avoir cliqué sur « enregister ».
	// - Pouvoir effacer une tâche (petit lien à côté de la tâche dans la liste (genre « x »)).
	// - Réaliser une page où on affiche la tâche (avec date de modif, etc.)
}();
