const get = require("lodash.get")
const isArray = require("lodash.isarray")
const isEmpty = require("lodash.isempty")
const isObject = require("lodash.isobject")
const isPlainObject = require("lodash.isplainobject")
const autoBind = require('auto-bind');
const { resolvePath, applyPatch } = require('mobx-state-tree');

class SliceFactory {
  constructor(id, config) {
    this.id = id;
    this.config = config;

  }
}

class PatchFactory {
  constructor(op, path, value) {
    this.op = op
    this.path = path
    this.value = value
  }
}

class PathFactory {
  constructor(path) {
    this.path = path
  }
}

const isClass = (item, type) => {
  if(item && item.constructor) {
    return item.constructor.name === type
  }
  return false
}

const isSlice = item => isClass(item, 'SliceFactory')
const isPath = item => isClass(item, 'PathFactory')



class MstFactory {
  constructor(models, slices, nameDepth = 0) {
    this.slices = slices;
    this.models = models;
    this.nameDepth = nameDepth
    autoBind(this);
  }

  parseSlice(slice) {
    if (slice && isArray(slice)) {
      return this.handleArray(slice)
    }
    if (isObject(slice)) {
      if (isPlainObject(slice) && !isSlice(slice)) {
        return this.handleSliceObject(slice);
      }
      if (isSlice(slice)) {
        return this.handleSlice(slice)
      }
    }
    return slice;
  }

  handleSlice(slice) {
    const sliceModel = this.getSlice(slice);
    return this.parseSlice(sliceModel);
  }
  handleArray(arr) {
    return arr.map(child => this.parseSlice(child), this);
  }
  handleSliceObject(obj) {
    if (isEmpty(obj)) return {};
    const mock = Object.keys(obj).reduce((acc, k) => {
      acc[k] = this.parseSlice(obj[k]);
      return acc;
    }, {});

    return mock;
  }

  getSlice(slice) {
    if(typeof slice === 'string') {
      return get(this.slices, slice)
    }
    const sliceModel = get(this.slices, slice.id);

    if (sliceModel) {
      if (slice.config && isSlice(sliceModel) && sliceModel.config) {
        sliceModel.config = Object.assign({}, slice.config, sliceModel.config)
      } else if(slice.config) {
        return Object.assign({}, sliceModel, slice.config);
      }
      return sliceModel;
    }

    console.log(`no model at ${mock.id}`);
  }

  getName(store) {
    if(typeof store === 'string') {
      return store.split('.')[this.nameDepth]
    } else {
      return store.id.split('.')[this.nameDepth]
    }
  }

  create(store, patches) {

    const mockStore = this.parseSlice(this.getSlice(store));
    const storeConstructor = this.models[this.getName(store)];

    const storeInstance = storeConstructor.create(mockStore);
    if(patches) {
      const parsedPatches = patches.map(patch => {
        return Object.assign({}, patch, {value: this.parseSlice(patch.value)})
      })
      applyPatch(storeInstance, parsedPatches)
    }
    return storeInstance
  }

  createProps(store, props) {
    return Object.keys(props).reduce((acc, k) => {
      const prop = props[k];
      if (isPath(prop)) {
        acc[k] = resolvePath(store, prop.path);
      } else {
        acc[k] = this.parseSlice(props[k]);
      }
      return acc;
    }, {});
  }
}

const path = (path) => new PathFactory(path)
const patch = (op, path, value) => new PatchFactory(op, path, value)
const slice = (id, config) => new SliceFactory(id, config)

module.exports = {
  MstFactory,
  slice,
  path,
  patch
};
