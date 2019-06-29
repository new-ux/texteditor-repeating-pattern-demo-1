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
    (delta.ops.length === 1 && delta.ops[0].insert) ||
    (delta.ops[1] && delta.ops[1].insert) ||
    (prevState &&
      ((delta.ops.length === 1 &&
        delta.ops[0].delete &&
        prevState.text.substr(0, delta.ops[0].delete)) ||
        (delta.ops[1] &&
          delta.ops[1].delete &&
          prevState.text.substr(delta.ops[0].retain, delta.ops[1].delete))));

  hist.push({
    delta,
    text: quill.getText(),
    value,
    delete: isDelete(delta),
    insert: isInsert(delta)
  });

  if (
    (delta.ops.length === 1 && delta.ops[0].delete) ||
    (delta.ops[1] && delta.ops[1].delete)
  ) {
    // retain is an offset
    console.log("delete", "«" + value + "»");
  } else if (
    (delta.ops.length === 1 && delta.ops[0].insert) ||
    (delta.ops[1] && delta.ops[1].insert)
  ) {
    console.log("insert", "«" + value + "»");

    // Squasher. as undo instead. remove latest delete->insert actions pair
    if (
      hist.length >= 2 &&
      prevState &&
      prevState.delete &&
      prevState.value === value
    ) {
      console.log("as undo", "remove latest delete->insert actions pair", {
        value
      });
      hist.length = hist.length - 2;
    }
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
  return (
    (delta.ops.length === 1 && delta.ops[0].delete) ||
    (delta.ops[1] && delta.ops[1].delete)
  );
}

function isInsert(delta) {
  return (
    (delta.ops.length === 1 && delta.ops[0].insert) ||
    (delta.ops[1] && delta.ops[1].insert)
  );
}
