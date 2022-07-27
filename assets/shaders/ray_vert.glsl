#version 300 es
precision highp float;

in vec4 iPosition;

void main() {
    gl_Position = iPosition;
}