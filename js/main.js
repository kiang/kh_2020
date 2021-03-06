var sidebar = new ol.control.Sidebar({ element: 'sidebar', position: 'right' });
var jsonFiles, filesLength, fileKey = 0;

var projection = ol.proj.get('EPSG:3857');
var projectionExtent = projection.getExtent();
var size = ol.extent.getWidth(projectionExtent) / 256;
var resolutions = new Array(20);
var matrixIds = new Array(20);
for (var z = 0; z < 20; ++z) {
    // generate resolutions and matrixIds arrays for this WMTS
    resolutions[z] = size / Math.pow(2, z);
    matrixIds[z] = z;
}

function pointStyleFunction(f) {
  var color = '#64416b', stroke, radius;
  if(f === currentFeature) {
    stroke = new ol.style.Stroke({
      color: '#000',
      width: 5
    });
    radius = 25;
  } else {
    stroke = new ol.style.Stroke({
      color: '#fff',
      width: 2
    });
    radius = 15;
  }
  return new ol.style.Style({
    image: new ol.style.RegularShape({
      radius: radius,
      points: 3,
      fill: new ol.style.Fill({
        color: color
      }),
      stroke: stroke
    })
  })
}
var sidebarTitle = document.getElementById('sidebarTitle');
var content = document.getElementById('sidebarContent');

var appView = new ol.View({
  center: ol.proj.fromLonLat([120.341986, 22.676082]),
  zoom: 14
});

var vectorPoints = new ol.layer.Vector({
  source: new ol.source.Vector(),
  style: pointStyleFunction
});

var baseLayer = new ol.layer.Tile({
    source: new ol.source.WMTS({
        matrixSet: 'EPSG:3857',
        format: 'image/png',
        url: 'https://wmts.nlsc.gov.tw/wmts',
        layer: 'EMAP',
        tileGrid: new ol.tilegrid.WMTS({
            origin: ol.extent.getTopLeft(projectionExtent),
            resolutions: resolutions,
            matrixIds: matrixIds
        }),
        style: 'default',
        wrapX: true,
        attributions: '<a href="http://maps.nlsc.gov.tw/" target="_blank">國土測繪圖資服務雲</a>'
    }),
    opacity: 0.8
});

var map = new ol.Map({
  layers: [baseLayer, vectorPoints],
  target: 'map',
  view: appView
});

map.addControl(sidebar);
var pointClicked = false;
var previousFeature = false;
var currentFeature = false;

map.on('singleclick', function(evt) {
  content.innerHTML = '';
  pointClicked = false;
  map.forEachFeatureAtPixel(evt.pixel, function (feature, layer) {
    if(false === pointClicked) {
      var p = feature.getProperties();
      var targetHash = '#' + p.properties.key;
      if (window.location.hash !== targetHash) {
        window.location.hash = targetHash;
      }
      pointClicked = true;
    }
  });
});

var votes = {};
var findTerms = [];
var adminTree = {};
var pointsFc = [];
$.getJSON('data.json', {}, function(c) {
  votes = c;
  for(k in votes) {
    var f = new ol.Feature({
      geometry: new ol.geom.Point(ol.proj.fromLonLat([votes[k].X, votes[k].Y])),
      properties: {
        key: k
      }
    });
    pointsFc.push(f);

    findTerms.push({
      value: k,
      label: k + ' ' + votes[k]['投開票所名稱'] + ' ' + votes[k]['所屬村里'] + ' ' + votes[k]['所屬鄰別']
    });

    if(!adminTree[votes[k]['系統區']]) {
      adminTree[votes[k]['系統區']] = {};
    }
    if(!adminTree[votes[k]['系統區']][votes[k]['所屬村里']]) {
      adminTree[votes[k]['系統區']][votes[k]['所屬村里']] = {};
    }
    adminTree[votes[k]['系統區']][votes[k]['所屬村里']][votes[k]['所屬鄰別']] = k;
  }
  var areaOptions = '<option value="">--</option>';
  for(area in adminTree) {
    areaOptions += '<option value="' + area + '">' + area + '</option>';
  }
  $('#selectArea').html(areaOptions);
  vectorPoints.getSource().addFeatures(pointsFc);
  routie(':pointId', showPoint);

  $('#findPoint').autocomplete({
    source: findTerms,
    select: function(event, ui) {
      var vfc = vectorPoints.getSource().getFeatures();
      if(vfc.length !== pointsFc.length) {
        selectedArea = '';
        adminTreeChange();
      }
      var targetHash = '#' + ui.item.value;
      if (window.location.hash !== targetHash) {
        window.location.hash = targetHash;
      }
    }
  });
})

$('#selectArea').change(function() {
  areaChange();
  cunliChange();
  adminTreeChange();
  window.location.hash = '';
  $('#findPoint').val('');
  sidebar.close();
});
$('#selectCunli').change(function() {
  cunliChange();
  neighborChange();
  adminTreeChange();
  window.location.hash = '';
  $('#findPoint').val('');
  sidebar.close();
});
$('#selectNeighbor').change(function() {
  neighborChange();
  adminTreeChange();
  if(selectedNeighbor !== '') {
    window.location.hash = '#' + selectedNeighbor;
    $('#findPoint').val(selectedNeighbor);
  } else {
    window.location.hash = '';
    $('#findPoint').val('');
    sidebar.close();
  }
  
});

var areaChange = function() {
  selectedArea = $('#selectArea').val();
  if(selectedArea !== '') {
    selectedCunli = '';
    var cunliOptions = '<option value="">--</option>';
    for(cunli in adminTree[selectedArea]) {
      cunliOptions += '<option value="' + cunli + '">' + cunli + '</option>';
    }
    $('#selectCunli').html(cunliOptions);
  } else {
    selectedNeighbor = '';
    selectedCunli = '';
    $('#selectNeighbor').html('');
    $('#selectCunli').html('');
  }
}
var cunliChange = function() {
  selectedCunli = $('#selectCunli').val();
  if(selectedCunli !== '' && adminTree[selectedArea][selectedCunli]) {
    var neighborOptions = '<option value="">--</option>';
    for(neighbor in adminTree[selectedArea][selectedCunli]) {
      neighborOptions += '<option value="' + adminTree[selectedArea][selectedCunli][neighbor] + '">' + neighbor + '(' + adminTree[selectedArea][selectedCunli][neighbor] + ')</option>';
    }
    $('#selectNeighbor').html(neighborOptions);
  } else {
    selectedNeighbor = '';
    $('#selectNeighbor').html('');
  }
}
var neighborChange = function() {
  selectedNeighbor = $('#selectNeighbor').val();
}

var selectedArea = '', selectedNeighbor = '', selectedCunli = '';
var adminTreeChange = function() {
  var vSource = vectorPoints.getSource();
  var vFormat = vSource.getFormat();
  var newFeatures = [];
  vSource.clear();
  if(selectedArea !== '') {
    for(k in pointsFc) {
      var key = pointsFc[k].getProperties().properties.key;
      if(votes[key]['系統區'] === selectedArea) {
        if(selectedCunli === '' || votes[key]['所屬村里'] === selectedCunli) {
          newFeatures.push(pointsFc[k]);
        }
      }
    }
  } else {
    newFeatures = pointsFc;
  }
  vSource.addFeatures(newFeatures);
  if(newFeatures.length > 1) {
    var ex = vSource.getExtent();
    if(!ol.extent.isEmpty(ex)) {
      map.getView().fit(ex);
    }
  }
}

function showPoint(pointId) {
  var features = vectorPoints.getSource().getFeatures();
  for(k in features) {
    var p = features[k].getProperties();
    if(p.properties.key === pointId) {
      currentFeature = features[k];
      features[k].setStyle(pointStyleFunction(features[k]));
      if(false !== previousFeature) {
        previousFeature.setStyle(pointStyleFunction(previousFeature));
      }
      previousFeature = currentFeature;
      appView.setCenter(features[k].getGeometry().getCoordinates());
      appView.setZoom(15);

      var lonLat = ol.proj.toLonLat(p.geometry.getCoordinates());
      var message = '<table class="table table-dark">';
      message += '<tbody>';
      for(pk in votes[p.properties.key]) {
        message += '<tr><th scope="row" style="width: 100px;">' + pk + '</th><td>' + votes[p.properties.key][pk] + '</td></tr>';
      }
      message += '<tr><td colspan="2">';
      message += '<hr /><div class="btn-group-vertical" role="group" style="width: 100%;">';
      message += '<a href="https://www.google.com/maps/dir/?api=1&destination=' + lonLat[1] + ',' + lonLat[0] + '&travelmode=driving" target="_blank" class="btn btn-info btn-lg btn-block">Google 導航</a>';
      message += '<a href="https://wego.here.com/directions/drive/mylocation/' + lonLat[1] + ',' + lonLat[0] + '" target="_blank" class="btn btn-info btn-lg btn-block">Here WeGo 導航</a>';
      message += '<a href="https://bing.com/maps/default.aspx?rtp=~pos.' + lonLat[1] + '_' + lonLat[0] + '" target="_blank" class="btn btn-info btn-lg btn-block">Bing 導航</a>';
      message += '</div></td></tr>';
      message += '</tbody></table>';
      sidebarTitle.innerHTML = votes[p.properties.key]['投開票所名稱'];
      content.innerHTML = message;
      sidebar.open('home');
    }
  }
}

var geolocation = new ol.Geolocation({
  projection: appView.getProjection()
});

geolocation.setTracking(true);

geolocation.on('error', function(error) {
  console.log(error.message);
});

var positionFeature = new ol.Feature();

positionFeature.setStyle(new ol.style.Style({
  image: new ol.style.Circle({
    radius: 6,
    fill: new ol.style.Fill({
      color: '#3399CC'
    }),
    stroke: new ol.style.Stroke({
      color: '#fff',
      width: 2
    })
  })
}));

var firstPosDone = false;
geolocation.on('change:position', function() {
  var coordinates = geolocation.getPosition();
  positionFeature.setGeometry(coordinates ? new ol.geom.Point(coordinates) : null);
  if(false === firstPosDone) {
    appView.setCenter(coordinates);
    firstPosDone = true;
  }
});

new ol.layer.Vector({
  map: map,
  source: new ol.source.Vector({
    features: [positionFeature]
  })
});

$('#btn-geolocation').click(function () {
  var coordinates = geolocation.getPosition();
  if(coordinates) {
    appView.setCenter(coordinates);
  } else {
    alert('目前使用的設備無法提供地理資訊');
  }
  return false;
});