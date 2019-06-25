import React, {Component} from 'react';
import mapboxgl from 'mapbox-gl'
import {withStyles} from "@material-ui/core";
import PropTypes from 'prop-types'
import {toLatLon} from "utm";

mapboxgl.accessToken = "pk.eyJ1IjoibHVjYXNhbGJhbm8iLCJhIjoiY2p4N3NleXI0MDIxbDNzb2Fmd3ZqYzFyYyJ9.rztpd1pMi5rGbCZ3AXSeSg";

const dataset = {
  "dataset_name": "f3_seismic",
  "bounding_box": {
    "corner_1": [605835.5, 6073556.4],
    "corner_2": [629576.3, 6074219.9],
    "corner_3": [605381.7999756628, 6089799.684204645],
    "corner_4": [629122.5016734808, 6090463.195958918]
  }
};

const styles = {
  map: {
    width: "100vw",
    height: "100vh"
  },
  stats: {
    position: "absolute",
    zIndex: 5
  }
};

class MapBox extends Component {
  constructor(props) {
    super(props);
    this.state = {
      dataset: dataset,
      lng: 5,
      lat: 34,
      zoom: 10
    }
  }

  componentDidMount() {
    const {zoom, paint} = this.state;
    const {bounding_box} = this.state.dataset;
    let hoverLineId = null;


    let cords = Object.keys(bounding_box).map((cords) => {
      return [toLatLon(bounding_box[cords][0], bounding_box[cords][1], 32, "f").latitude, toLatLon(bounding_box[cords][0], bounding_box[cords][1], 32, "f").longitude]
    });

    cords = this.addPoints(cords, 255);

    //bundle cords in to pairs of lines
    const cordsBundle = this.bundleCords(cords);

    console.log(cordsBundle);

    const lines = cordsBundle.map(cords => ({
      type: 'Feature',
      properties: {
        description: cords,
      },
      geometry: {
        type: 'LineString',
        coordinates: cords,
      }
    }));

    this.setState({
      lat: cords[0][1],
      lon: cords[0][0]
    });

    const map = new mapboxgl.Map({
      container: this.mapContainer,
      style: 'mapbox://styles/mapbox/light-v8',
      center: [cords[0][0], cords[0][1]],
      zoom
    });

    map.on('move', () => {
      const {lng, lat} = map.getCenter();

      this.setState({
        lng: lng.toFixed(4),
        lat: lat.toFixed(4),
        zoom: map.getZoom().toFixed(2)
      });
    });

    map.on('load', () => {

      map.addSource('xlines', {
        'type': "geojson",
        "data": {
          "type": "FeatureCollection",
          "features": lines
        },
        'generateId': true
      });

      map.addLayer({
        "id": "lines",
        "type": "line",
        "source": "xlines",
        "layout": {
          "line-join": "round",
          "line-cap": "round"
        },
        "paint": {
          "line-color": ["case", ["boolean", ["feature-state", "hover"], false], "#FFF000", "#111"],
          "line-width": ["case", ["boolean", ["feature-state", "hover"], false],
            10,
            2
          ]
        }
      });

    });


    map.on('click', 'lines', function (e) {
      let coordinates = e.features[0].geometry.coordinates.slice();
      console.log(...coordinates);
    });

    // Change the cursor to a pointer when the mouse is over the places layer.
    map.on('mousemove', 'lines', function (e) {
      map.getCanvas().style.cursor = 'pointer';
      if (e.features.length > 0) {
        console.log(hoverLineId)
        if (hoverLineId) {
          map.setFeatureState({source: 'xlines', id: hoverLineId}, {hover: false});
        }
        hoverLineId = e.features[0].id;
        map.setFeatureState({source: 'xlines', id: hoverLineId}, {hover: true});
      }
    });

// Change it back to a pointer when it leaves.
    map.on('mouseleave', 'lines', function () {
      map.getCanvas().style.cursor = '';
      if (hoverLineId >= 0) {
        map.setFeatureState({source: 'xlines', id: hoverLineId}, {hover: false});
      }
      hoverLineId = null;
    });
  }


  bundleCords(cords) {
    let matrix = [], i, k;

    for (i = 0, k = -1; i < cords.length; i++) {
      if (i % 2 === 0) {
        k++;
        matrix[k] = [];
      }

      matrix[k].push(cords[i]);
    }

    return matrix;
  }

  addPoints(cords, num_of_lines) {
    let divider = num_of_lines + 1;

    //set difference between initial two lines
    let lon_top = (cords[1][0] - cords[3][0]) / divider;
    let lat_top = (cords[1][1] - cords[3][1]) / divider;
    let lon_bottom = (cords[0][0] - cords[2][0]) / divider;
    let lat_bottom = (cords[0][1] - cords[2][1]) / divider;
    let init_lon_top = cords[1][0];
    let init_lat_top = cords[1][1];
    let init_lon_bottom = cords[0][0];
    let init_lat_bottom = cords[0][1];
    let new_arr_top = [];
    let new_arr_bottom = [];
    let final_arr = [];

    //generate new points along the top and bottom
    for (let i = 0; i < num_of_lines; i++) {
      new_arr_top[i] = [init_lon_top -= lon_top, init_lat_top -= lat_top];
      new_arr_bottom[i] = [init_lon_bottom -= lon_bottom, init_lat_bottom -= lat_bottom];
    }

    //add the first line to the final array
    final_arr.push(cords[0], cords[1]);
    console.log("first two: ", cords[0], cords[1]);

    //intertwine the two arrays that were generated
    for (let i = 0; i < num_of_lines; i++) {
      final_arr.push(new_arr_bottom[i], new_arr_top[i])
    }

    //push last line to the final array
    final_arr.push(cords[2], cords[3]);
    console.log("last two: ", cords[2], cords[3]);

    console.log("final array: ", final_arr);

    return final_arr


    /*n_top /= ++num_of_lines;
    for (let i = 0; i < num_of_lines-1; i++){
      new_arr[i] = [y, x+=n_top];
    }*/
    //add original cords to front and back
    // new_arr.push(cords[1])
    // new_arr.unshift(cords[2])

  }

  render() {
    const {lng, lat, zoom} = this.state;
    const {classes} = this.props;

    return (
      <div>
        <script type="text/javascript" src="src/mapboxgl-minimap.js"></script>
        <div className={classes.stats}>
          <div>{`Longitude: ${lng} Latitude: ${lat} Zoom: ${zoom}`}</div>
        </div>
        <div ref={el => this.mapContainer = el} className={classes.map}/>
      </div>
    );
  }
}

MapBox.propTypes = {
  classes: PropTypes.object.isRequired,
};

export default withStyles(styles)(MapBox);