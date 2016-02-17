/*
 * author: Nuño de la Serna.
 * Copyrights licensed under the MIT License.
 * See the accompanying LICENSE file for terms.
*/

vertex:

attribute vec3 vposition; // x y z
varying highp vec2 vtexturecoord; // s t

void main(void) {
   vtexturecoord = (vposition.xy + 1.) / 2.;
   gl_Position = vec4(vposition, 1.0);
}

fragment:

uniform vec2 vresolution;
struct channel_check {
   int R;
   int G;
   int B;
};
uniform channel_check channels;
uniform sampler2D simage_base;
uniform sampler2D simage_over;

varying highp vec2 vtexturecoord;

void main() {
//   vec2 uv = gl_FragCoord.xy / vresolution.xy;
   vec4 basecolor = texture2D(simage_base, vtexturecoord);
   vec4 overcolor = texture2D(simage_over, vtexturecoord);

   vec4 color = basecolor.rgba;
   if (channels.R > 0)
      color.r = overcolor.r;
   if (channels.G > 0)
      color.g = overcolor.g;
   if (channels.B > 0)
      color.b = overcolor.b;

   gl_FragColor = color;
}
