const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');
const ts = require('typescript');

const flatten = style => Array.isArray(style) ? Object.assign({}, ...style.map(flatten)) : style || {};

function loadProductCard() {
  const jsx = (type, props) => ({ type, props: props || {} });
  const ui = new Proxy({}, { get: (_, name) => name });
  const modules = {
    'react/jsx-runtime': { jsx, jsxs: jsx },
    'react-native': { Pressable: 'Pressable', View: 'View', StyleSheet: { create: value => value, flatten } },
    'lucide-react-native': ui,
    '../../ui/motion': { MotionPressable: 'MotionPressable', usePressFeedback: () => ({style:{transform:[]}}), useEntrance: () => ({opacity:1,transform:[]}) },
    '../../services/api': { mediaUrl: value => value },
    '../../ui/components': ui,
    '../../ui/theme': { colors:{},touchTarget:48 },
  };
  const code = ts.transpileModule(fs.readFileSync(path.join(__dirname, '../src/screens/catalog/catalog-ui.tsx'), 'utf8'), { compilerOptions: { module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ES2022 } }).outputText;
  const module = {exports:{}};
  vm.runInNewContext(code, {module,exports:module.exports,Intl,require:name=>{assert.ok(name in modules,name);return modules[name];}});
  return module.exports.ProductCard;
}

test('native product grids reserve concrete photo height and natural text height, without flex-basis collapse', () => {
  const ProductCard = loadProductCard();
  const product = {id:'fixture',name:'Long product name',images:['/fixture.jpg'],variants:[{price:8.5,original_price:8.9}]};
  for (const width of [140,165,190,205]) {
    const card = ProductCard({product,style:{width},onProduct(){}});
    const [imageFrame,info] = card.props.children;
    assert.equal(flatten(imageFrame.props.style).height,width*1.04);
    assert.equal(flatten(imageFrame.props.children[0].props.style).height,width*1.04);
    assert.equal(flatten(info.props.style).flex,undefined);
    assert.equal(flatten(info.props.style).flexBasis,undefined);
    const label = info.props.children[0];
    assert.equal(label.props.children,product.name);
    assert.equal(label.props.numberOfLines,2);
  }
  for (const [layout,height] of [['list',116],['compact',75]]) {
    const card = ProductCard({product,layout,style:{width:300},onProduct(){}});
    assert.equal(flatten(card.props.children[0].props.style).height,height);
    assert.equal(flatten(card.props.children[1].props.style).flex,layout==='list'?1:undefined);
  }
});

test('native navigation controls status bar contrast without a permanent dark global override', () => {
  const source = fs.readFileSync(path.join(__dirname,'../App.tsx'),'utf8');
  assert.doesNotMatch(source,/<StatusBar style="dark"\/>/);
  assert.match(source,/getFocusedRouteNameFromRoute\(route\)[\s\S]*?=== 'main_page' \? 'light' : 'dark'/);
  assert.match(source,/<Stack.Screen name="about_screen" component=\{AboutScreen\} options=\{\{ statusBarStyle: 'light' \}\}\/>/);
});
