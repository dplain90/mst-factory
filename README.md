# Mst Factory

_This package provides utility functions for building mobx-state-tree stores using slices of static state. Useful for writing Jest/Enzyme tests._

# Installation

NPM: `npm install mobx-factory --save`

# Example

```js

import { types } from 'mobx-state-tree'
import { slice, MstFactory } from 'mst-factory'

const Todo = types.model({
  title: types.string,
  done: types.boolean
})

const Store = types.model({
  todos: types.array(Todo)
})

const models = {
  todo: Todo,
  store: Store
}

const slices = {
  todo: {
    default: {
      title: 'Default Todo',
      done: false
    }
  }
  store: {
    default: {
      todos: [slice('todo.default')]
    }
  }
}

const factory = new MstFactory(models, slices)
factory.create('store.default') // returns instance of Store model with snapshot of:
  /*
    {
      todos:
        [
          {
            title: 'Default Todo',
            done: false
          }
        ]
    }
  */
```
# API

## slice
___

Reference to another slice

**Parameters**

-   `path` String  Path to slice being referenced
-   `override` Object Attributes to override

**Example**
```js
import { slice, MstFactory } from 'mst-factory'

const Todo = types.model({
  title: types.string,
  done: types.boolean
})

const slices = {
  todo: {
    default: {
      title: 'Default Todo',
      done: false
    },
    completed: slice('todo.default', {done: true}),
    dishes: slice('todo.completed', {title: 'Do the dishes'})
  }
}

const models = { todo: ToDo }
const factory = new MstFactory(slices, models)

factory.create('todo.default') // Todo Instance with snapshot: { title: 'Default Todo', done: false}

factory.create('todo.completed') // Todo Instance with snapshot: { title: 'Default Todo', done: true}

factory.create('todo.dishes') // Todo Instance with snapshot: { title: 'Do the dishes', done: true}
```

## MstFactory
___
Creates a new factory based off of the models and slices you give it.

**Parameters**

-   `models` Object of MST Types
-   `slices` Object of MST Model Slices   
-   `nameDepth` Number = 0, Depth in slices of the name of the model

**Example**
```js
const Todo = types.model({
  title: types.string,
  done: types.boolean
})

const slices = {
  todo: {
    default: {
      title: 'Default Todo',
      done: false
    },
    completed: slice('todo.default', {done: true}),
    dishes: slice('todo.completed', {title: 'Do the dishes'})
  }
}

const models = { todo: ToDo }
const factory = new MstFactory(slices, models)
```

Methods
=======

factory.create
--------------

**Parameters**

-   `Slice Path` Path to root slice of store ( can be a string or a slice )
-   `Patches` Array of JSON patches to be applied to store after it's created.

Returns Instance of MST Model

factory.createProps
-------------------
  createProps allows you to generate static objects that can have properties that reference paths of a store.  
  This is helpful for creating props for a React component that use instances of your store.


**Parameters**

-   `Slice Path` Path to root store slice of store ( can be a string or a slice )
-   `Props Path` Path to root props

Returns Object


**Example**
```js

const Todo = types.model({
  title: types.string,
  done: types.boolean
})

const slices = {
  todo: {
    default: {
      title: 'Default Todo',
      done: false
    },
    completed: slice('todo.default', {done: true}),
    dishes: slice('todo.completed', {title: 'Do the dishes'})
  }
  store: {
    todos: [slice('todo.default'), slice('todo.dishes')]
  }
  props: {
    listComponent: {
      isOpen: false,
      todos: path('/todos')
    }
  }
}

const models = { todo: ToDo }
const factory = new MstFactory(slices, models)

factory.createProps('store.default', 'props.listComponent') // returns object of
 /*
  {
    isOpen: false,
    todos: Store.todos
  }
 */  
```

## path
___

path function can be used when writing a props slice you want generated with createProps.  
Once the MST store has been created, it will resolve the path you provide it to that location in the store.  

**Example**
```js
import { slice, path, MstFactory } from 'mst-factory'
const Todo = types.model({
  title: types.string,
  done: types.boolean
})

const slices = {
  todo: {
    default: {
      title: 'Default Todo',
      done: false
    },
    completed: slice('todo.default', {done: true}),
    dishes: slice('todo.completed', {title: 'Do the dishes'})
  }
  store: {
    default: {

      todos: [slice('todo.default'), slice('todo.dishes')]
    }
  }
  props: {
    listItem: {
      isOpen: true,
      item: path('/todos/0')
    },
    anotherListItem: {
      isOpen: false,
      item: path('/todos/1')
    }

  }
}

const models = { todo: ToDo }
const factory = new MstFactory(slices, models)

factory.createProps('store.default', 'props.listItem') // returns object of
 /*
  {
    isOpen: true,
    item: Store.todos[0], snapshot would be: { title: 'DefaultTodo', done: false}
  }
 */  

factory.createProps('store.default', 'props.anotherListItem') // returns object of
 /*
  {
    isOpen: false,
    item: Store.todos[1], snapshot would be: { title: 'Do the dishes', done: true}
  }
 */  
```
