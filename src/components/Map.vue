<template>
  <div id="rootDiv">
    <div id="mapContainer" ref="mapContainer" class="mapDiv"></div>
    <div class="editButton">
      <el-dropdown @command="drawClick" placement="top">
        <el-button type="primary">绘制图形</el-button>
        <el-dropdown-menu slot="dropdown">
          <el-dropdown-item command="Point">
            <svg class="icon" aria-hidden="true">
              <use xlink:href="#icon-point" />
            </svg>点
          </el-dropdown-item>
          <el-dropdown-item command="LineString">
            <svg class="icon" aria-hidden="true">
              <use xlink:href="#icon-linestring" />
            </svg>线
          </el-dropdown-item>
          <el-dropdown-item command="Circle">
            <svg class="icon" aria-hidden="true">
              <use xlink:href="#icon-circle" />
            </svg>圆
          </el-dropdown-item>
          <el-dropdown-item command="Polygon">
            <svg class="icon" aria-hidden="true">
              <use xlink:href="#icon-polygon" />
            </svg>多边形
          </el-dropdown-item>
        </el-dropdown-menu>
      </el-dropdown>
      <div style="margin-top:5px">
        <el-button type="danger" @click="stopClick">停止绘制</el-button>
      </div>
      <div style="margin-top:5px">
        <el-button type="info" @click="removeClick">清除图形</el-button>
      </div>
    </div>

    <div class="operationDiv">
      <div>
        <el-input-number
          v-model="res"
          :min="0"
          :max="15"
          controls-position="right"
          style="width:120px;"
        ></el-input-number>
      </div>
      <div>
        <el-button
          class="operationButton"
          id="h3Button"
          v-on:click="h3Click"
          type="primary"
          style="margin-top:5px;width:120px"
        >生成H3网格</el-button>
      </div>
      <div>
        <el-button
          class="operationButton"
          id="exportButton"
          v-on:click="exportClick"
          type="primary"
          style="margin-top:5px;width:120px;"
        >导出geojson</el-button>
      </div>
    </div>
  </div>
</template>
<script>
import "ol/ol.css";
import Map from "ol/Map";
import View from "ol/View";
import Draw from "ol/interaction/Draw";
import TileLayer from "ol/layer/Tile";
import VectorLayer from "ol/layer/Vector";
import { OSM, Vector as VectorSource } from "ol/source";
import { fromCircle } from "ol/geom/Polygon";
import GeoJSON from "ol/format/GeoJSON";

import {
  geoToH3,
  h3ToGeoBoundary,
  h3Line,
  h3SetToMultiPolygon,
  polyfill
} from "h3-js";

export default {
  name: "Map",
  data() {
    return {
      map: null,
      baseMap: null,
      editLayer: null,
      drawLayer: null,
      drawType: "None",
      vectorSource: null,
      hexagonLayer: null,
      res: 12 // 0-15
    };
  },
  mounted() {
    this.baseMap = new TileLayer({
      source: new OSM()
    });

    this.vectorSource = new VectorSource({
      wrapX: false
    });

    this.editLayer = new VectorLayer({
      source: this.vectorSource
    });

    this.map = new Map({
      target: "mapContainer",
      layers: [this.baseMap, this.editLayer],
      view: new View({
        center: [0, 0],
        zoom: 2,
        projection: "EPSG:4326"
      })
    });
  },
  methods: {
    addInteraction: function() {
      let value = this.drawType;
      if (value !== "None") {
        this.drawLayer = new Draw({
          source: this.vectorSource,
          type: this.drawType
        });
        this.map.addInteraction(this.drawLayer);
      }
    },
    drawClick: function(command) {
      this.drawType = command;
      this.map.removeInteraction(this.drawLayer);
      this.addInteraction();
    },
    stopClick: function() {
      this.drawType = "None";
      this.map.removeInteraction(this.drawLayer);
    },
    removeClick: function() {
      this.vectorSource.clear();
      this.hexagonLayer.getSource().clear();
    },
    h3Click: function() {
      const features = this.vectorSource.getFeatures();

      // TODO 要素过大提示
      // TODO merge重叠的feature

      const geojsonObject = {
        type: "GeometryCollection",
        geometries: []
      };

      for (let i = 0; i < features.length; ++i) {
        const geom = features[i].getGeometry();
        let type = geom.getType();
        let coord = geom.getCoordinates();

        // 将圆形转为近似多边形处理
        if (type === "Circle") {
          coord = fromCircle(geom).getCoordinates();
          type = "Polygon";
        }

        let geo = null;

        if (type === "Point") {
          geo = this.point2Hex(coord);
          geo = [[geo]];
        } else if (type === "LineString") {
          geo = this.line2Hex(coord);
        } else if (type === "Polygon") {
          geo = this.polygon2Hex(coord[0]);
        }

        geojsonObject.geometries.push({
          type: "MultiPolygon",
          coordinates: geo
        });
      }
      this.hexagonLayer = new VectorLayer({
        source: new VectorSource({
          features: new GeoJSON().readFeatures(geojsonObject)
        })
      });

      this.map.addLayer(this.hexagonLayer);
    },
    exportClick: function() {
      // TODO 导出geojson文件
    },
    point2Hex: function(point) {
      let idx = geoToH3(point[1], point[0], this.res);
      let geo = h3ToGeoBoundary(idx, true);
      return geo;
    },
    line2Hex: function(line) {
      let idxs = new Set();
      for (let i = 1; i < line.length; ++i) {
        const startIdx = geoToH3(line[i - 1][1], line[i - 1][0], this.res);
        const endIdx = geoToH3(line[i][1], line[i][0], this.res);

        const lineIdxs = h3Line(startIdx, endIdx);
        idxs = new Set([...idxs, ...lineIdxs]);
      }
      return this.h3Indexs2GeoBoundary(idxs);
    },
    polygon2Hex: function(polygon) {
      const hexs = polyfill(polygon, this.res, true);
      return this.h3Indexs2GeoBoundary(hexs);
    },
    h3Indexs2GeoBoundary: function(idxs) {
      let geos = [];
      idxs.forEach(element => {
        geos.push([h3ToGeoBoundary(element, true)]);
      });
      return geos;
    }
  }
};
</script>
<style scoped>
#rootDiv {
  width: 100%;
  height: 100%;
  margin: 0;
  padding: 0;
}
.mapDiv {
  height: 100%;
  width: 100%;
  position: absolute;
  z-index: 1;
}
.editButton {
  margin-left: 1em;
  margin-top: 15%;
  position: absolute;
  z-index: 2;
}
.operationDiv {
  margin-right: 1em;
  margin-top: 15%;
  position: relative;
  float: right;
  z-index: 2;
}
.icon {
  margin-right: 5px;
}
</style>