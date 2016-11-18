// Create a map object based on usmap library
var mapInfo = {
    regionColors:['#5c7981', '#643c18', '#b2721a', '#dbd543', '#679a61', '#e28e45', '#508dac', '#a48f70', '#9dcbdb', '#d99b9c'],
    regionStates: [
      ['CT', 'MA', 'ME', 'NH', 'RI', 'VT', ],
      ['NJ', 'NY', ],
      ['DE', 'MD', 'PA', 'VA', 'WV', ],
      ['AL', 'FL', 'GA', 'KY', 'MS', 'NC', 'SC', 'TN', ],
      ['IL', 'IN', 'MI', 'MN', 'OH', 'WI', ],
      ['AR', 'LA', 'TX', 'NM', 'OK', ],
      ['IA', 'KS', 'MO', 'NE', ],
      ['CO', 'MT', 'ND', 'SD', 'UT', 'WY', ],
      ['AZ', 'CA', 'HI', 'NV', ],
      ['AK', 'ID', 'OR', 'WA', ],
    ],
    
}

function mapObject(div_name, mapInfoClass){
    this.container_div = div_name;
    this.colors = mapInfoClass.regionColors;
    this.regions = mapInfoClass.regionStates;
    this.style = {};
    for(var i = 0; i < this.regions.length; i++) {
      for(var j = 0; j < this.regionStates[i].length; j++) {
            this.style[this.regionStates[i][j]] = {fill: this.regionColors[i]};
      }
    }
}
