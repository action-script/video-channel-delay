/*
 * author: Nuño de la Serna.
 * Copyrights licensed under the MIT License.
 * See the accompanying LICENSE file for terms.
*/

vertex:

attribute vec3 vposition;
//uniform mat4 mproj;
//uniform mat4 mview;

void main(void) {
   //gl_Position = mproj * mview * vec4(vposition, 1.0);
   gl_Position = vec4(vposition, 1.0);
}

fragment:

uniform vec2 vresolution;
vec3 vcolor = vec3(0.5, 0.5, 1.0);
void main() {
   vec2 uv = gl_FragCoord.xy / vresolution.xy;
   gl_FragColor = vec4(vcolor + uv.x/3., 1.0);
}
