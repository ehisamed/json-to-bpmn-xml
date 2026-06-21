import { forEach, bind, pick, assign, isString, isObject, set } from 'min-dash';

/**
 * Moddle base element.
 */
function Base() { }

/**
 * @template { keyof this } K
 *
 * Get property value (typed)
 *
 * @overload
 *
 * @param {K} name
 *
 * @return { this[K] }
 */
/**
 * @template T
 *
 * Get property value
 *
 * @overload
 *
 * @param {string} name
 *
 * @return {T}
 */
/**
 * Get property value
 *
 * @overload
 *
 * @param {string} name
 *
 * @return {unknown}
 */
Base.prototype.get = function(name) {
  return this.$model.properties.get(this, name);
};

/**
 * @template { keyof this } K
 * @template { this[K] } V
 *
 * Set property value
 *
 * @overload
 *
 * @param {K} name
 * @param {V} value
 */
/**
 * @template { string } S
 *
 * Set property value
 *
 * @overload
 *
 * @param { S extends keyof this ? never : S } name
 * @param { any } value
 */
Base.prototype.set = function(name, value) {
  this.$model.properties.set(this, name, value);
};

/**
 * @typedef {import('./ns.js').Namespace} Namespace
 * @typedef {import('./moddle.js').default} Moddle
 * @typedef {import('./properties.js').default} Properties
 * @typedef {import('./registry.js').EffectiveDescriptor} EffectiveDescriptor
 * @typedef {import('./base.js').default} BaseElement
 * @typedef {import('./descriptor-builder.js').AnyTypeDescriptor} AnyTypeDescriptor
 */

/**
 * @template [T=Record<string,any>]
 * @typedef {{
 *   new(attrs?: Partial<T>): ModdleElement<T>;
 *   prototype: ModdleElement<T>;
 *   readonly $model: Moddle;
 *   readonly $descriptor: EffectiveDescriptor;
 * }} ModdleElementType
 */

/**
 * @template [T=Record<string,any>]
 * @typedef {BaseElement & T & {
 *   readonly $model: Moddle;
 *   readonly $descriptor: EffectiveDescriptor;
 *   readonly $type: Namespace['name'];
 *   readonly $attrs: Record<string, any>;
 *   $parent?: ModdleElement | AnyModdleElement;
 *   hasType: Moddle['hasType'];
 *   $instanceOf: Moddle['hasType'];
 * }} ModdleElement
 */

/**
 * @template [T=Record<string,any>]
 * @typedef {BaseElement & T & {
 *   $type: string;
 *   $instanceOf: (type: string) => boolean;
 *   $parent?: ModdleElement | AnyModdleElement;
 *   readonly $model: Moddle;
 *   readonly $descriptor: AnyTypeDescriptor;
 * }} AnyModdleElement
 */

/**
 * A model element factory.
 *
 * @param {Moddle} model
 * @param {Properties} properties
 */
function Factory(model, properties) {

  /**
   * @private
   */
  this.model = model;

  /**
   * @private
   */
  this.properties = properties;
}

/**
 * @template [T=Record<string,any>]
 * @param {EffectiveDescriptor} descriptor
 * @return {ModdleElementType<T>}
 */
Factory.prototype.createType = function(descriptor) {

  var model = this.model;

  var props = this.properties,
      prototype = Object.create(Base.prototype);

  // initialize default values
  forEach(descriptor.properties, function(p) {
    if (!p.isMany && p.default !== undefined) {
      prototype[p.name] = p.default;
    }
  });

  props.defineModel(prototype, model);
  props.defineDescriptor(prototype, descriptor);

  var name = descriptor.ns.name;

  /**
   * The new type constructor
   *
   * @type { ModdleElementType }
   */
  function ModdleElement(attrs) {
    props.define(this, '$type', { value: name, enumerable: true });
    props.define(this, '$attrs', { value: {} });
    props.define(this, '$parent', { writable: true });

    forEach(attrs, bind(function(val, key) {
      this.set(key, val);
    }, this));
  }

  ModdleElement.prototype = prototype;

  ModdleElement.hasType = prototype.$instanceOf = this.model.hasType;

  // static links
  props.defineModel(ModdleElement, model);
  props.defineDescriptor(ModdleElement, descriptor);

  return ModdleElement;
};

/**
 * Built-in moddle types
 */
var BUILTINS = {
  String: true,
  Boolean: true,
  Integer: true,
  Real: true,
  Element: true
};

/**
 * Converters for built-in types from string representations
 */
var TYPE_CONVERTERS = {
  String: function(s) { return s; },
  Boolean: function(s) { return s === 'true'; },
  Integer: function(s) { return parseInt(s, 10); },
  Real: function(s) { return parseFloat(s); }
};

/**
 * @typedef {'String'} StringType
 * @typedef {'Boolean'} BooleanType
 * @typedef {'Integer'} IntegerType
 * @typedef {'Real'} RealType
 * @typedef {'Element'} ElementType
 * @typedef {StringType | BooleanType | IntegerType | RealType} BuiltInSimpleType
 * @typedef {BuiltInSimpleType | ElementType} BuiltInType
 */

/**
 * Convert given value to string
 * @overlord
 * @param {StringType} type
 * @param {any} value
 * @return {string}
 */
/**
 * Convert given value to boolean
 * @overlord
 * @param {BooleanType} type
 * @param {any} value
 * @return {boolean}
 */
/**
 * Convert given value to number
 * @overlord
 * @param {IntegerType | RealType} type
 * @param {any} value
 * @return {number}
 */
/**
 * Convert a type to its real representation
 * @template T
 * @overlord
 * @param {Exclude<string,BuiltInSimpleType>} type
 * @param {T} value
 * @return {T}
 */
function coerceType(type, value) {

  var converter = TYPE_CONVERTERS[type];

  if (converter) {
    return converter(value);
  } else {
    return value;
  }
}

/**
 * Return whether the given type is built-in
 * @overload
 * @param {BuiltInType} type
 * @return {true}
 */
/**
 * Return whether the given type is built-in
 * @overload
 * @param {Exclude<string,BuiltInType>} type
 * @return {false}
 */
function isBuiltIn(type) {
  return !!BUILTINS[type];
}

/**
 * Return true if the given type is simple
 * @overload
 * @param {BuiltInSimpleType} type
 * @return {true}
 */
/**
 * Return false the given type is not simple
 * @overload
 * @param {Exclude<string,BuiltInSimpleType>} type
 * @return {false}
 */
function isSimple(type) {
  return !!TYPE_CONVERTERS[type];
}

/**
 * @typedef {{
 *   name: string;
 *   prefix: string;
 *   localName: string;
 * }} Namespace
 */

/**
 * Parses a namespaced attribute name of the form (ns:)localName to an object,
 * given a default prefix to assume in case no explicit namespace is given.
 *
 * @param {String} name
 * @param {String} [defaultPrefix] the default prefix to take, if none is present.
 *
 * @return {Namespace} the parsed name
 */
function parseName(name, defaultPrefix) {
  var parts = name.split(/:/),
      localName, prefix;

  // no prefix (i.e. only local name)
  if (parts.length === 1) {
    localName = name;
    prefix = defaultPrefix;
  }

  // prefix + local name
  else if (parts.length === 2) {
    localName = parts[1];
    prefix = parts[0];
  }

  else {
    throw new Error('expected <prefix:localName> or <localName>, got ' + name);
  }

  name = (prefix ? prefix + ':' : '') + localName;

  return {
    name: name,
    prefix: prefix,
    localName: localName
  };
}

/**
 * @typedef {import('./ns.js').Namespace} Namespace
 * @typedef {import('./registry.js').RegisteredPackage} RegisteredPackage
 * @typedef {import('./registry.js').RegisteredTypeDef} RegisteredTypeDef
 * @typedef {import('./registry.js').RegisteredPropertyDef} RegisteredPropertyDef
 */

/**
 * Effective element descriptor
 * aka element type descriptor
 * aka element descriptor
 * @typedef {{
 *   readonly ns: Namespace;
 *   readonly name: Namespace['name'];
 *   readonly allTypes: Array<RegisteredTypeDef>;
 *   readonly allTypesByName: Record<string, RegisteredTypeDef>;
 *   readonly properties: Array<PropertyDescriptor>;
 *   readonly propertiesByName: Record<string, PropertyDescriptor>;
 *   readonly bodyProperty?: PropertyDescriptor;
 *   readonly idProperty?: PropertyDescriptor;
 *   readonly $pkg?: RegisteredPackage;
 * }} EffectiveDescriptor
 */

/**
 * Property descriptor
 * @typedef {RegisteredPropertyDef & {
 *   localName: Namespace['localName'];
 *   inherited?: boolean;
 *   definedBy?: RegisteredTypeDef;
 * }} PropertyDescriptor
 */

/**
 * @typedef {{
 *   name: string;
 *   isGeneric: true;
 *   ns: {
 *     prefix: string;
 *     localName: string;
 *     uri: string;
 *   };
 * }} AnyTypeDescriptor
 */

/**
 * A utility to build element descriptors.
 * @class DescriptorBuilder
 * @param {Namespace} nameNs
 */
function DescriptorBuilder(nameNs) {

  /**
   * @private
   * @type {Namespace}
   */
  this.ns = nameNs;

  /**
   * @private
   * @type {Namespace['name']}
   */
  this.name = nameNs.name;

  /**
   * @private
   * @type {Array<RegisteredTypeDef>}
   */
  this.allTypes = [];

  /**
   * @private
   * @type {Record<string, RegisteredTypeDef>}
   */
  this.allTypesByName = {};

  /**
   * @private
   * @type {Array<PropertyDescriptor>}
   */
  this.properties = [];

  /**
   * @private
   * @type {Record<string, PropertyDescriptor>}
   */
  this.propertiesByName = {};
}

/**
 * @return {EffectiveDescriptor}
 */
DescriptorBuilder.prototype.build = function() {
  return pick(this, [
    'ns',
    'name',
    'allTypes',
    'allTypesByName',
    'properties',
    'propertiesByName',
    'bodyProperty',
    'idProperty'
  ]);
};

/**
 * Add property at given index.
 *
 * @param {PropertyDescriptor} p
 * @param {Number} [idx]
 * @param {Boolean} [validate=true]
 */
DescriptorBuilder.prototype.addProperty = function(p, idx, validate) {

  if (typeof idx === 'boolean') {
    validate = idx;
    idx = undefined;
  }

  this.addNamedProperty(p, validate !== false);

  var properties = this.properties;

  if (idx !== undefined) {
    properties.splice(idx, 0, p);
  } else {
    properties.push(p);
  }
};

/**
 * @param {PropertyDescriptor} oldProperty
 * @param {PropertyDescriptor} newProperty
 * @param {string} replace
 */
DescriptorBuilder.prototype.replaceProperty = function(oldProperty, newProperty, replace) {
  var oldNameNs = oldProperty.ns;

  var props = this.properties,
      propertiesByName = this.propertiesByName,
      rename = oldProperty.name !== newProperty.name;

  if (oldProperty.isId) {
    if (!newProperty.isId) {
      throw new Error(
        'property <' + newProperty.ns.name + '> must be id property ' +
        'to refine <' + oldProperty.ns.name + '>');
    }

    this.setIdProperty(newProperty, false);
  }

  if (oldProperty.isBody) {

    if (!newProperty.isBody) {
      throw new Error(
        'property <' + newProperty.ns.name + '> must be body property ' +
        'to refine <' + oldProperty.ns.name + '>');
    }

    // TODO: Check compatibility
    this.setBodyProperty(newProperty, false);
  }

  // validate existence and get location of old property
  var idx = props.indexOf(oldProperty);
  if (idx === -1) {
    throw new Error('property <' + oldNameNs.name + '> not found in property list');
  }

  // remove old property
  props.splice(idx, 1);

  // replacing the named property is intentional
  //
  //  * validate only if this is a "rename" operation
  //  * add at specific index unless we "replace"
  //
  this.addProperty(newProperty, replace ? undefined : idx, rename);

  // make new property available under old name
  propertiesByName[oldNameNs.name] = propertiesByName[oldNameNs.localName] = newProperty;
};

/**
 * @param {PropertyDescriptor} p
 * @param {string} targetPropertyName
 * @param {string} replace
 */
DescriptorBuilder.prototype.redefineProperty = function(p, targetPropertyName, replace) {

  var nsPrefix = p.ns.prefix;
  var parts = targetPropertyName.split('#');

  var name = parseName(parts[0], nsPrefix);
  var attrName = parseName(parts[1], name.prefix).name;

  var redefinedProperty = this.propertiesByName[attrName];
  if (!redefinedProperty) {
    throw new Error('refined property <' + attrName + '> not found');
  } else {
    this.replaceProperty(redefinedProperty, p, replace);
  }

  delete p.redefines;
};

/**
 * @param {PropertyDescriptor} p
 * @param {boolean} validate
 */
DescriptorBuilder.prototype.addNamedProperty = function(p, validate) {
  var ns = p.ns,
      propsByName = this.propertiesByName;

  if (validate) {
    this.assertNotDefined(p, ns.name);
    this.assertNotDefined(p, ns.localName);
  }

  propsByName[ns.name] = propsByName[ns.localName] = p;
};

/**
 * @param {RegisteredPropertyDef} p
 */
DescriptorBuilder.prototype.removeNamedProperty = function(p) {
  var ns = p.ns,
      propsByName = this.propertiesByName;

  delete propsByName[ns.name];
  delete propsByName[ns.localName];
};

/**
 * @param {PropertyDescriptor} p
 * @param {boolean} [validate]
 */
DescriptorBuilder.prototype.setBodyProperty = function(p, validate) {

  if (validate && this.bodyProperty) {
    throw new Error(
      'body property defined multiple times ' +
      '(<' + this.bodyProperty.ns.name + '>, <' + p.ns.name + '>)');
  }

  this.bodyProperty = p;
};

/**
 * @param {PropertyDescriptor} p
 * @param {boolean} [validate]
 */
DescriptorBuilder.prototype.setIdProperty = function(p, validate) {

  if (validate && this.idProperty) {
    throw new Error(
      'id property defined multiple times ' +
      '(<' + this.idProperty.ns.name + '>, <' + p.ns.name + '>)');
  }

  this.idProperty = p;
};

/**
 * @param {RegisteredTypeDef} typeDescriptor
 */
DescriptorBuilder.prototype.assertNotTrait = function(typeDescriptor) {

  const _extends = typeDescriptor.extends || [];

  if (_extends.length) {
    throw new Error(
      `cannot create <${ typeDescriptor.name }> extending <${ typeDescriptor.extends }>`
    );
  }
};

/**
 * @param {PropertyDescriptor} p
 */
DescriptorBuilder.prototype.assertNotDefined = function(p, name) {
  var propertyName = p.name,
      definedProperty = this.propertiesByName[propertyName];

  if (definedProperty) {
    throw new Error(
      'property <' + propertyName + '> already defined; ' +
      'override of <' + definedProperty.definedBy.ns.name + '#' + definedProperty.ns.name + '> by ' +
      '<' + p.definedBy.ns.name + '#' + p.ns.name + '> not allowed without redefines');
  }
};

/**
 * @param {string} name
 * @return {PropertyDescriptor}
 */
DescriptorBuilder.prototype.hasProperty = function(name) {
  return this.propertiesByName[name];
};

/**
 * @param {RegisteredTypeDef} t
 * @param {boolean} inherited
 */
DescriptorBuilder.prototype.addTrait = function(t, inherited) {

  if (inherited) {
    this.assertNotTrait(t);
  }

  var typesByName = this.allTypesByName,
      types = this.allTypes;

  var typeName = t.name;

  if (typeName in typesByName) {
    return;
  }

  forEach(t.properties, bind(function(p) {

    // clone property to allow extensions
    p = assign({}, p, {
      name: p.ns.localName,
      inherited: inherited
    });

    Object.defineProperty(p, 'definedBy', {
      value: t
    });

    var replaces = p.replaces,
        redefines = p.redefines;

    // add replace/redefine support
    if (replaces || redefines) {
      this.redefineProperty(p, replaces || redefines, replaces);
    } else {
      if (p.isBody) {
        this.setBodyProperty(p);
      }
      if (p.isId) {
        this.setIdProperty(p);
      }
      this.addProperty(p);
    }
  }, this));

  types.push(t);
  typesByName[typeName] = t;
};

/**
 * @typedef {import('./ns.js').Namespace} Namespace
 * @typedef {import('./moddle.js').PackageDefinition} PackageDefinition
 * @typedef {import('./moddle.js').TypeDefinition} TypeDefinition
 * @typedef {import('./moddle.js').PropertyDefinition} PropertyDefinition
 * @typedef {import('./properties.js').default} Properties
 * @typedef {import('./descriptor-builder.js').EffectiveDescriptor} EffectiveDescriptor
 */

/**
 * Registered package definition
 * @typedef {Omit<PackageDefinition, 'types'> & {
 *   types?: Array<RegisteredTypeDef>;
 * }} RegisteredPackage
 */

/**
 * Registered type definition
 * @typedef {Omit<TypeDefinition, 'properties'> & {
 *   properties?: Array<RegisteredPropertyDef>;
 *   propertiesByName?: Record<string, RegisteredPropertyDef>;
 *   superClass?: Array<string>;
 *   extends?: Array<string>;
 *   meta?: Record<string, *>;
 *   traits?: Array<string>;
 *   ns?: Namespace;
 *   readonly $pkg?: RegisteredPackage;
 * }} RegisteredTypeDef
 */

/**
 * Registered property definition
 * @typedef {PropertyDefinition & { ns: Namespace }} RegisteredPropertyDef
 */

/**
 * A registry of Moddle packages.
 *
 * @param {Array<PackageDefinition> | Record<string,PackageDefinition>} packages
 * @param {Properties} properties
 */
function Registry(packages, properties) {

  /**
   * @private
   * @type {Record<string, RegisteredPackage>} registered packages map
   */
  this.packageMap = {};

  /**
   * @type {Record<string,RegisteredTypeDef>}
   */
  this.typeMap = {};

  /**
   * @private
   * @type {Array<RegisteredPackage>} all registered packages
   */
  this.packages = [];

  /**
   * @private
   * @type {Properties}
   */
  this.properties = properties;

  forEach(packages, bind(this.registerPackage, this));
}

/**
 * @param {string} uriOrPrefix uri or prefix of package
 * @return {RegisteredPackage} registered package
 */
Registry.prototype.getPackage = function(uriOrPrefix) {
  return this.packageMap[uriOrPrefix];
};

/**
 * @return {Array<RegisteredPackage>} all registered packages
 */
Registry.prototype.getPackages = function() {
  return this.packages;
};

/**
 * @private
 * @param {PackageDefinition} pkg registering package
 */
Registry.prototype.registerPackage = function(pkg) {

  // copy package
  pkg = assign({}, pkg);

  var pkgMap = this.packageMap;

  ensureAvailable(pkgMap, pkg, 'prefix');
  ensureAvailable(pkgMap, pkg, 'uri');

  // register types
  forEach(pkg.types, bind(function(descriptor) {
    this.registerType(descriptor, pkg);
  }, this));

  pkgMap[pkg.uri] = pkgMap[pkg.prefix] = pkg;
  this.packages.push(pkg);
};

/**
 * @private
 * Register a type from a specific package with us
 * @param {TypeDefinition} type
 * @param {RegisteredPackage} pkg
 */
Registry.prototype.registerType = function(type, pkg) {
  type = assign({}, type, {
    superClass: (type.superClass || []).slice(),
    extends: (type.extends || []).slice(),
    properties: (type.properties || []).slice(),
    meta: assign((type.meta || {}))
  });

  var ns = parseName(type.name, pkg.prefix),
      name = ns.name,
      /** @type {Record<string, RegisteredPropertyDef>} */ propertiesByName = {};

  // parse properties
  forEach(type.properties, bind(function(p) {

    // namespace property names
    var propertyNs = parseName(p.name, ns.prefix),
        propertyName = propertyNs.name;

    // namespace property types
    if (!isBuiltIn(p.type)) {
      p.type = parseName(p.type, propertyNs.prefix).name;
    }

    assign(p, {
      ns: propertyNs,
      name: propertyName
    });

    propertiesByName[propertyName] = p;
  }, this));

  // update ns + name
  assign(type, {
    ns: ns,
    name: name,
    propertiesByName: propertiesByName
  });

  forEach(type.extends, bind(function(extendsName) {
    var extendsNameNs = parseName(extendsName, ns.prefix);

    var extended = this.typeMap[extendsNameNs.name];

    extended.traits = extended.traits || [];
    extended.traits.push(name);
  }, this));

  // link to package
  this.definePackage(type, pkg);

  // register
  this.typeMap[name] = type;
};

/**
 * @callback IteratorFn
 * @param {RegisteredTypeDef} type
 * @param {boolean} inherited
 */

/**
 * Traverse the type hierarchy from bottom to top,
 * calling iterator with (type, inherited) for all elements in
 * the inheritance chain.
 * @private
 * @param {Namespace} nsName
 * @param {IteratorFn} iterator
 * @param {Boolean} [trait=false]
 */
Registry.prototype.mapTypes = function(nsName, iterator, trait) {

  /** @type {RegisteredTypeDef} */
  var type = isBuiltIn(nsName.name) ? { name: nsName.name } : this.typeMap[nsName.name];

  var self = this;

  /**
   * Traverse the selected super type or trait
   *
   * @param {String} cls
   * @param {Boolean} [trait=false]
   */
  function traverse(cls, trait) {
    var parentNs = parseName(cls, isBuiltIn(cls) ? '' : nsName.prefix);
    self.mapTypes(parentNs, iterator, trait);
  }

  /**
   * Traverse the selected trait.
   *
   * @param {String} cls
   */
  function traverseTrait(cls) {
    return traverse(cls, true);
  }

  /**
   * Traverse the selected super type
   *
   * @param {String} cls
   */
  function traverseSuper(cls) {
    return traverse(cls, false);
  }

  if (!type) {
    throw new Error('unknown type <' + nsName.name + '>');
  }

  forEach(type.superClass, trait ? traverseTrait : traverseSuper);

  // call iterator with (type, inherited=!trait)
  iterator(type, !trait);

  forEach(type.traits, traverseTrait);
};

/**
 * Returns the effective descriptor for a type.
 * @param  {Namespace['name']} name the namespaced name (ns:localName) of the type
 * @return {EffectiveDescriptor} the resulting effective descriptor
 */
Registry.prototype.getEffectiveDescriptor = function(name) {

  var nsName = parseName(name);

  var builder = new DescriptorBuilder(nsName);

  this.mapTypes(nsName, function(type, inherited) {
    builder.addTrait(type, inherited);
  });

  var descriptor = builder.build();

  // define package link
  this.definePackage(descriptor, descriptor.allTypes[descriptor.allTypes.length - 1].$pkg);

  return descriptor;
};

/**
 * @private
 * @param {RegisteredTypeDef | EffectiveDescriptor} target
 * @param {RegisteredPackage} pkg
 */
Registry.prototype.definePackage = function(target, pkg) {
  this.properties.define(target, '$pkg', { value: pkg });
};

// helpers ////////////////////////////

/**
 * Checking already defined packages
 * @param {Record<string, RegisteredPackage>} packageMap
 * @param {PackageDefinition} pkg
 * @param {'prefix' | 'uri'} identifierKey
 */
function ensureAvailable(packageMap, pkg, identifierKey) {

  var value = pkg[identifierKey];

  if (value in packageMap) {
    throw new Error('package with ' + identifierKey + ' <' + value + '> already defined');
  }
}

/**
 * @typedef {import('./moddle.js').default} Moddle
 * @typedef {import('./descriptor-builder.js').PropertyDescriptor} PropertyDesc
 * @typedef {import('./registry.js').EffectiveDescriptor} EffectiveDescriptor
 * @typedef {import('./factory.js').ModdleElement} ModdleElement
 * @typedef {import('./descriptor-builder.js').AnyTypeDescriptor} AnyTypeDescriptor
 */

/**
 * A utility that gets and sets properties of model elements.
 *
 * @param {Moddle} model
 */
function Properties(model) {

  /** @type {Moddle} */
  this.model = model;
}

/**
 * Sets a named property on the target element.
 * If the value is undefined, the property gets deleted.
 *
 * @param {ModdleElement} target
 * @param {String} name
 * @param {Object} value
 */
Properties.prototype.set = function(target, name, value) {

  if (!isString(name) || !name.length) {
    throw new TypeError('property name must be a non-empty string');
  }

  var property = this.getProperty(target, name);

  var propertyName = property && property.name;

  if (isUndefined(value)) {

    // unset the property, if the specified value is undefined;
    // delete from $attrs (for extensions) or the target itself
    if (property) {
      delete target[propertyName];
    } else {
      delete target.$attrs[stripGlobal(name)];
    }
  } else {

    // set the property, defining well defined properties on the fly
    // or simply updating them in target.$attrs (for extensions)
    if (property) {
      if (propertyName in target) {
        target[propertyName] = value;
      } else {
        defineProperty(target, property, value);
      }
    } else {
      target.$attrs[stripGlobal(name)] = value;
    }
  }
};

/**
 * Returns the named property of the given element
 *
 * @param  {ModdleElement} target
 * @param  {String} name
 *
 * @return {Object}
 */
Properties.prototype.get = function(target, name) {

  var property = this.getProperty(target, name);

  if (!property) {
    return target.$attrs[stripGlobal(name)];
  }

  var propertyName = property.name;

  // check if access to collection property and lazily initialize it
  if (!target[propertyName] && property.isMany) {
    defineProperty(target, property, []);
  }

  return target[propertyName];
};

/**
 * Define a property on the target element
 * @template [T=any]
 * @param  {NonNullable<T>} target
 * @param  {String} name
 * @param  {PropertyDescriptor} options
 */
Properties.prototype.define = function(target, name, options) {

  if (!options.writable) {

    var value = options.value;

    // use getters for read-only variables to support ES6 proxies
    // cf. https://github.com/bpmn-io/internal-docs/issues/386
    options = assign({}, options, {
      get: function() { return value; }
    });

    delete options.value;
  }

  Object.defineProperty(target, name, options);
};

/**
 * Define the descriptor for an element
 * @template [T=any]
 * @param {NonNullable<T>} target
 * @param {EffectiveDescriptor | AnyTypeDescriptor} descriptor
 */
Properties.prototype.defineDescriptor = function(target, descriptor) {
  this.define(target, '$descriptor', { value: descriptor });
};

/**
 * Define the model for an element
 * @template [T=any]
 * @param {NonNullable<T>} target
 * @param {Moddle} model
 */
Properties.prototype.defineModel = function(target, model) {
  this.define(target, '$model', { value: model });
};

/**
 * Return property with the given name on the element.
 *
 * @param {ModdleElement} target
 * @param {string} name
 *
 * @return {PropertyDesc | null} property
 */
Properties.prototype.getProperty = function(target, name) {

  var model = this.model;

  var property = model.getPropertyDescriptor(target, name);

  if (property) {
    return property;
  }

  if (name.includes(':')) {
    return null;
  }

  const strict = model.config.strict;

  if (typeof strict !== 'undefined') {
    const error = new TypeError(`unknown property <${ name }> on <${ target.$type }>`);

    if (strict) {
      throw error;
    } else {

      typeof console !== 'undefined' && console.warn(error);
    }
  }

  return null;
};

function isUndefined(val) {
  return typeof val === 'undefined';
}

function defineProperty(target, property, value) {
  Object.defineProperty(target, property.name, {
    enumerable: !property.isReference,
    writable: true,
    value: value,
    configurable: true
  });
}

function stripGlobal(name) {
  return name.replace(/^:/, '');
}

/**
 * @typedef {import('./registry.js').RegisteredTypeDef} RegisteredTypeDef
 * @typedef {import('./registry.js').RegisteredPackage} RegisteredPackage
 * @typedef {import('./base.js').default} BaseElement
 * @typedef {import('./descriptor-builder.js').EffectiveDescriptor} EffectiveDescriptor
 * @typedef {import('./descriptor-builder.js').AnyTypeDescriptor} AnyTypeDescriptor
 * @typedef {import('./descriptor-builder.js').PropertyDescriptor} PropertyDescriptor
 */

/**
 * @template [T=Record<string,any>]
 * @typedef {import('./factory.js').ModdleElement<T>} ModdleElement
 * @typedef {import('./factory.js').ModdleElementType<T>} ModdleElementType
 * @typedef {import('./factory.js').AnyModdleElement<T>} AnyModdleElement
 */

/**
 * Package definition
 * @typedef {{
 *   $schema?: string;
 *   name: string;
 *   prefix: string;
 *   types?: Array<TypeDefinition>;
 *   [key: string]: any;
 * } & PackageDefinitionXmlExtension} PackageDefinition
 */

/**
 * Set of extended parameters for package definition used in moddle-xml.
 * @typedef {{
 *   uri?: string;
 *   xml?: {
 *     tagAlias?: 'lowerCase';
 *     typePrefix?: string;
 *   };
 * }} PackageDefinitionXmlExtension
 */

/**
 * Type definition in declaration in package
 * @typedef {{
 *   name: string;
 *   isAbstract?: boolean;
 *   properties?: Array<PropertyDefinition>;
 *   superClass?: Array<string>;
 *   extends?: Array<string>;
 *   meta?: Record<string, *>;
 *   [key: string]: any;
 * }} TypeDefinition
 */

/**
 * Set of extended parameters for property definition used in moddle-xml.
 * @typedef {{
 *   isBody?: boolean;
 *   isAttr?: boolean;
 *   xml?: {
 *     serialize?: string;
 *   };
 * }} PropertyDefinitionXmlExtension
 */

/**
 * Property definition of type definition
 * @typedef {{
 *   name: string;
 *   type: 'String' | 'Boolean' | 'Integer' | 'Real' | string;
 *   default?: string | boolean | number;
 *   isMany?: boolean;
 *   isReference?: boolean;
 *   isId?: boolean;
 *   redefines?: string;
 *   replaces?: string;
 *   [key: string]: any;
 * } & PropertyDefinitionXmlExtension} PropertyDefinition
 */

// Moddle implementation /////////////////////////////////////////////////

/**
 * @class Moddle
 *
 * A model that can be used to create elements of a specific type.
 *
 * @example
 *
 * import Moddle from 'moddle';
 *
 * var pkg = {
 *   name: 'mypackage',
 *   prefix: 'my',
 *   types: [
 *     { name: 'Root' }
 *   ]
 * };
 *
 * var moddle = new Moddle([pkg]);
 *
 * @param {Array<PackageDefinition> | Record<string,PackageDefinition>} packages the packages to contain
 * @param {{ strict?: boolean }} [config={}] moddle configuration
 */
function Moddle(packages, config = {}) {

  /** @type Readonly<Properties> */
  this.properties = new Properties(this);

  /** @type Readonly<Factory> */
  this.factory = new Factory(this, this.properties);

  /** @type Readonly<Registry> */
  this.registry = new Registry(packages, this.properties);

  /**
   * @type {Record<string,ModdleElementType>}
   */
  this.typeCache = {};

  /**
   * @type {Readonly<{readonly strict?: boolean}>}
   */
  this.config = config;
}

/**
 * Create an instance of the specified type.
 *
 * @method Moddle#create
 *
 * @example
 *
 * var foo = moddle.create('my:Foo');
 * var bar = moddle.create('my:Bar', { id: 'BAR_1' });
 *
 * @template [T=Record<string,any>]
 * @param  {String|EffectiveDescriptor} descriptor the type descriptor or name know to the model
 * @param  {Partial<T>} [attrs] a number of attributes to initialize the model instance with
 * @return {ModdleElement<T>} model instance
 */
Moddle.prototype.create = function(descriptor, attrs) {
  var Type = this.getType(descriptor);

  if (!Type) {
    throw new Error('unknown type <' + descriptor + '>');
  }

  return new Type(attrs);
};

/**
 * Returns the type representing a given descriptor
 *
 * @method Moddle#getType
 *
 * @example
 *
 * var Foo = moddle.getType('my:Foo');
 * var foo = new Foo({ 'id' : 'FOO_1' });
 *
 * @template [T=Record<string,any>]
 * @param  {String|EffectiveDescriptor} descriptor the type descriptor or name know to the model
 * @return {ModdleElementType<T>} the type representing the descriptor
 */
Moddle.prototype.getType = function(descriptor) {

  var cache = this.typeCache;

  var name = isString(descriptor) ? descriptor : descriptor.ns.name;

  var type = cache[name];

  if (!type) {
    descriptor = this.registry.getEffectiveDescriptor(name);
    type = cache[name] = this.factory.createType(descriptor);
  }

  return type;
};

/**
 * Creates an any-element type to be used within model instances.
 *
 * This can be used to create custom elements that lie outside the meta-model.
 * The created element contains all the meta-data required to serialize it
 * as part of meta-model elements.
 *
 * @method Moddle#createAny
 *
 * @example
 *
 * var foo = moddle.createAny('vendor:Foo', 'http://vendor', {
 *   value: 'bar'
 * });
 *
 * var container = moddle.create('my:Container', 'http://my', {
 *   any: [ foo ]
 * });
 *
 * // go ahead and serialize the stuff
 *
 * @template [T=Record<string, any>]
 * @param  {String} name  the name of the element
 * @param  {String} nsUri the namespace uri of the element
 * @param  {T} [properties] a map of properties to initialize the instance with
 * @return {AnyModdleElement<T>} the any type instance
 */
Moddle.prototype.createAny = function(name, nsUri, properties) {

  var nameNs = parseName(name);

  /** @type AnyModdleElement */
  var element = {
    $type: name,
    $instanceOf: function(type) {
      return type === this.$type;
    },
    get: function(key) {
      return this[key];
    },
    set: function(key, value) {
      set(this, [ key ], value);
    }
  };

  /** @type AnyTypeDescriptor */
  var descriptor = {
    name: name,
    isGeneric: true,
    ns: {
      prefix: nameNs.prefix,
      localName: nameNs.localName,
      uri: nsUri
    }
  };

  this.properties.defineDescriptor(element, descriptor);
  this.properties.defineModel(element, this);
  this.properties.define(element, 'get', { enumerable: false, writable: true });
  this.properties.define(element, 'set', { enumerable: false, writable: true });
  this.properties.define(element, '$parent', { enumerable: false, writable: true });
  this.properties.define(element, '$instanceOf', { enumerable: false, writable: true });

  forEach(properties, function(a, key) {
    if (isObject(a) && a.value !== undefined) {
      element[a.name] = a.value;
    } else {
      element[key] = a;
    }
  });

  return element;
};

/**
 * Returns a registered package by uri or prefix
 * @param {string} uriOrPrefix
 * @return {RegisteredPackage} the package
 */
Moddle.prototype.getPackage = function(uriOrPrefix) {
  return this.registry.getPackage(uriOrPrefix);
};

/**
 * Returns a snapshot of all known packages
 *
 * @return {Readonly<Array<RegisteredPackage>>} the package
 */
Moddle.prototype.getPackages = function() {
  return this.registry.getPackages();
};

/**
 * Returns the descriptor for an element
 * @param {ModdleElement | ModdleElementType} element
 * @return {EffectiveDescriptor}
 */
Moddle.prototype.getElementDescriptor = function(element) {
  return element.$descriptor;
};

/**
 * @overload
 * Returns true if the given descriptor or instance
 * represents the given type.
 * @param {ModdleElement | ModdleElementType} element
 * @param {string} type
 * @return {boolean}
 */
/**
 * @overload
 * @param {string} type
 * @return {boolean}
 */
Moddle.prototype.hasType = function(element, type) {
  if (type === undefined) {
    type = element;
    element = this;
  }

  var descriptor = element.$model.getElementDescriptor(element);

  return (type in descriptor.allTypesByName);
};

/**
 * Returns the descriptor of an elements named property
 * @param {ModdleElement | ModdleElementType} element
 * @param {string} property
 * @return {PropertyDescriptor}
 */
Moddle.prototype.getPropertyDescriptor = function(element, property) {
  return this.getElementDescriptor(element).propertiesByName[property];
};

/**
 * Return registered type definition
 * @param {string} type
 * @return {RegisteredTypeDef}
 */
Moddle.prototype.getTypeDescriptor = function(type) {
  return this.registry.typeMap[type];
};

export { Moddle, coerceType, isBuiltIn as isBuiltInType, isSimple as isSimpleType, parseName as parseNameNS };
//# sourceMappingURL=index.js.map
