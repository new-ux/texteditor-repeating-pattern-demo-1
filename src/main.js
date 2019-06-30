import Vue from "vue";
import App from "./App.vue";
import store from "./store";

Vue.config.productionTip = false;

new Vue({
  store,
  render: h => h(App)
}).$mount("#app");

const { quill } = window;
const hist = [];
window.hist = hist;

quill.on("text-change", function(delta, oldDelta, source) {
  console.log(source);

  const prevState = getHist(-1);

  const value =
    (isInsert(delta) && getDeltaWithOffset(delta).op.insert) ||
    (prevState &&
      prevState.text.substr(
        getDeltaWithOffset(delta).offset,
        getDeltaWithOffset(delta).op.delete ||
          (getAttribute(delta) && getAttribute(delta).len)
      ));

  hist.push({
    delta,
    text: quill.getText(),
    value,
    delete: isDelete(delta),
    insert: isInsert(delta),
    offset: getOffset(delta)
  });
  printHist();

  // Undo-annihilator. as undo instead. remove latest delete->insert actions pair
  if (
    hasSimilarActions(prevState, { value, delta }) &&
    (isInsertDeleteActionsPair(prevState, { delta }) ||
      isAttributeActionsPair(prevState, { delta }))
  ) {
    console.log("as undo", "remove latest actions pair", { value });

    hist.length = hist.length - 2;
    printHist();
  }
});

quill.on("selection-change", function(range, oldRange, source) {
  if (range) {
    if (range.length == 0) {
      console.log("User cursor is on", range.index);
    } else {
      var text = quill.getText(range.index, range.length);
      console.log("User has highlighted", text);
    }
  } else {
    console.log("Cursor not in the editor");
  }
});

function getHist(index) {
  if (hist.length < index + 1) return null;
  if (index >= 0) return hist[index];
  return hist[hist.length + index]; // index is less then 0
}

function isDelete(delta) {
  return Boolean(getDeltaWithOffset(delta).op.delete);
}

function isInsert(delta) {
  return Boolean(getDeltaWithOffset(delta).op.insert);
}

function getOffset(delta) {
  return (
    (delta.ops.length === 2 && delta.ops[0].retain) ||
    (delta.ops.length === 1 && 0)
  );
}

/**
 * get bold, italic, monospace action
 * @param {delta} delta quill delta
 */
function getAttribute(delta) {
  const {
    op: { attributes, retain },
    offset
  } = getDeltaWithOffset(delta);
  if (!attributes) return null;
  const keys = Object.keys(attributes);
  if (!keys.length) return null;
  if (keys.length > 1) {
    console.warn("no_impl_yet", "несколько атрибутов за одно действие", {
      keys,
      delta
    });
  }
  const [key] = keys;
  return { key, state: attributes[key], offset, len: retain };
}
function getDeltaWithOffset(delta) {
  return {
    ...delta,
    op: delta.ops.length === 1 ? delta.ops[0] : delta.ops[1],
    offset: getOffset(delta)
  };
}

function hasSimilarActions(prevState, { value, delta }) {
  return (
    hist.length >= 2 &&
    prevState &&
    prevState.value === value &&
    prevState.offset === getOffset(delta)
  );
}
function isInsertDeleteActionsPair(prevState, { delta }) {
  return (
    (prevState.delete && isInsert(delta)) ||
    (prevState.insert && isDelete(delta))
  );
}
function isAttributeActionsPair(prevState, { delta }) {
  const attr = getAttribute(delta);
  const prevAttr = getAttribute(prevState.delta);
  return (
    prevAttr &&
    attr &&
    prevAttr.key === attr.key &&
    prevAttr.state !== attr.state
  );
}

function formatAttribute(attribute) {
  const { key, state } = attribute;
  if (!attribute) return "";
  return state ? `mark ${key}` : `unmark ${key}`;
}

const $hist = document.querySelector("#hist");
function printHist() {
  $hist.innerHTML = hist
    .map(
      item =>
        `${(item.delete && "delete") ||
          (item.insert && "insert") ||
          formatAttribute(getAttribute(item.delta))}: «${item.value}» at ${
          item.offset
        }`
    )
    .join("\n");
}
