const { types, getType, getSnapshot } = require('mobx-state-tree')
const { slice, path, props, patch, MstFactory } = require('../src/index.js')


const setupStatics = () => {
  const Todo = types.model('Todo', {
    title: types.string,
    done: types.boolean
  })

  const Store = types.model('Store', {
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
      },
      overwrite: slice('todo.default', {done: true}),
      doubleOverwrite: slice('todo.overwrite', {title: 'Overwritten'})
    },
    store: {
      default: {
        todos: [slice('todo.default'), slice('todo.overwrite'), slice('todo.default')]
      }
    },
    props: {
      default: {
        todo: path('/todos/0'),
        open: false,
        c: 'testValue'
      }
    }
  }

  return {
    Todo,
    Store,
    models,
    slices
  }
}

test('slice', () => {
  const testSlice = slice('todo.default', {test: true})
  expect(testSlice.constructor.name).toEqual('SliceFactory')
  expect(testSlice.id).toEqual('todo.default')
  expect(testSlice.config).toEqual({test: true})
})

test('path', () => {
  const testPath = path('/todos/0')
  expect(testPath.constructor.name).toEqual('PathFactory')
  expect(testPath.path).toEqual('/todos/0')
})

test('patch', () => {
  const testPatch = patch('add', '/todos/0', slice('todo.default'))
  expect(testPatch.constructor.name).toEqual('PatchFactory')
  expect(testPatch.op).toEqual('add')
  expect(testPatch.path).toEqual('/todos/0')
  expect(testPatch.value.constructor.name).toEqual('SliceFactory')
  expect(testPatch.value.id).toEqual('todo.default')
})

describe('MstFactory', () => {
  const { Todo, Store, slices, models } = setupStatics()
  const factory = new MstFactory(models, slices)


  test('instantiates', () => {
    const factory = new MstFactory(models, slices)
    expect(factory.models).toEqual(models)
    expect(factory.slices).toEqual(slices)
    expect(factory.nameDepth).toEqual(0)
  })

  test('getName with default depth', () => {
    const factory = new MstFactory(models, slices)
    const name = factory.getName('todo.default')
    const name2 = factory.getName(slice('todo.default'))
    expect(name).toEqual('todo')
    expect(name2).toEqual('todo')
  })

  test('getName with custom depth', () => {
    const factory = new MstFactory(models, slices, 1)
    const name1 = factory.getName('models.todo.default')
    const name2 = factory.getName(slice('models.todo.default'))
    expect(name1).toEqual('todo')
    expect(name2).toEqual('todo')
  })
})



describe('getSlice', () => {
  const { Todo, Store, slices, models } = setupStatics()
  const factory = new MstFactory(models, slices)



  test('handles string path', () => {
    const mockResult = factory.getSlice('todo.default')
    expect(mockResult).toEqual({
      title: 'Default Todo',
      done: false
    })
  })

  test('handles slice instance', () => {
    const mockResult = factory.getSlice(slice('todo.default'))
    expect(mockResult).toEqual({
      title: 'Default Todo',
      done: false
    })
  })

  test('handles slice instance with override', () => {
    const mockResult = factory.getSlice(slice('todo.default', {title: 'overwritten'}))
    expect(mockResult).toEqual({
      title: 'overwritten',
      done: false
    })
  })

  test('handles nested slice instances with overrides', () => {
    expect(factory.parseSlice(slice('todo.doubleOverwrite'))).toEqual({
      title: 'Overwritten',
      done: true
    })
  })
})

describe('handleSliceObject', () => {
  const { Todo, Store, slices, models } = setupStatics()
  const factory = new MstFactory(models, slices)



  test('if object is empty return {}', () => {
    const mockResult = factory.handleSliceObject({})
    expect(mockResult).toEqual({})
  })

  test('called parseSlice for each key/value pair', () => {
    const parseSliceSpy = jest.fn((v) => v)
    factory.parseSlice = parseSliceSpy
    const mockResult = factory.handleSliceObject({a: 1, b: 2})

    expect(mockResult).toEqual({a: 1, b: 2})
    expect(parseSliceSpy).toHaveBeenCalledTimes(2);
  })
})



describe('parseSlice', () => {
  const { Todo, Store, slices, models } = setupStatics()
  const factory = new MstFactory(models, slices)
  const noMockFactory = new MstFactory(models, slices)



  test('returns primitives', () => {
    expect(factory.parseSlice(1)).toEqual(1)
    expect(factory.parseSlice('test')).toEqual('test')
    const date = new Date()
    expect(factory.parseSlice(date)).toEqual(date)
  })

  test('if is array calls handleArray', () => {
    const handleArraySpy = jest.fn(() => {
      return {hi: 2}
    })

    factory.handleArray = handleArraySpy
    factory.parseSlice([1,2,3])

    expect(handleArraySpy).toHaveBeenCalledTimes(1);
  })

  test('if plain object call handleSliceObject', () => {
    const mockObjectSpy = jest.fn()
    factory.handleSliceObject = mockObjectSpy
    factory.parseSlice({hi: 2})
    expect(mockObjectSpy).toHaveBeenCalledTimes(1);
  })

  test('if is slice calls handleSlice', () => {
    const handleSliceSpy = jest.fn(() => {
      return {hi: 2}
    })

    factory.handleSlice = handleSliceSpy
    factory.parseSlice(slice('todo.default'))

    expect(handleSliceSpy).toHaveBeenCalledTimes(1);
  })


  test('handles nested slice', () => {
    const result = noMockFactory.parseSlice(slice('todo.overwrite'))
    expect(result).toEqual({title: 'Default Todo', done: true})
  })

  test('handles double nested slice', () => {
    const result = noMockFactory.parseSlice(slice('todo.doubleOverwrite'))
    expect(result).toEqual({title: 'Overwritten', done: true})
  })

  test('handles arrays of slices', () => {
    const result = noMockFactory.parseSlice(slice('store.default'))

    expect(result.todos.length).toEqual(3)
    expect(result.todos[0].title).toEqual('Default Todo')
    expect(result.todos[1].done).toEqual(true)
  })
})


describe('create', () => {
    const { Todo, Store, slices, models } = setupStatics()
    const factory = new MstFactory(models, slices)
    test('returns a model instance', () => {
      const result = factory.create('store.default')
      expect(getType(result).name).toEqual('Store')
      const todoResult = factory.create('todo.default')
      expect(getType(todoResult).name).toEqual('Todo')

    })

    test('model snapshot matches', () => {
      const result = factory.create('store.default')
      expect(getSnapshot(result)).toEqual({
        todos: [
          {
            title: 'Default Todo',
            done: false
          },
          {
            title: 'Default Todo',
            done: true
          },
          {
            title: 'Default Todo',
            done: false
          }
        ]
      })
    })
})

describe('createProps', () => {
  const { Todo, Store, slices, models } = setupStatics()
  const factory = new MstFactory(models, slices)
  const sampleProps = {
    a: path('/todos/0'),
    b: 2,
    c: [1,2,3]
  }

  test('resolves path', () => {
    const store = factory.create('store.default')
    const props = factory.createProps(store, sampleProps)
    expect(getSnapshot(props.a)).toEqual({
        title: 'Default Todo',
        done: false
    })
  })

  test('creates correct object', () => {
    const store = factory.create('store.default')
    const props = factory.createProps(store, sampleProps)
    expect(props.b).toEqual(2)
    expect(props.c).toEqual([1,2,3])
  })



})
