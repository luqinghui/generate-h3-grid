import Vue from "vue";
import App from "./App.vue";

import "./assets/font/iconfont.js";
import "./assets/font/iconfont.css";

import {
  Dropdown,
  DropdownItem,
  DropdownMenu,
  Button,
  InputNumber,
  Upload
} from "element-ui";

Vue.use(Dropdown);
Vue.use(DropdownItem);
Vue.use(DropdownMenu);
Vue.use(Button);
Vue.use(InputNumber);
Vue.use(Upload);

Vue.config.productionTip = false;

new Vue({
  render: h => h(App)
}).$mount("#app");
