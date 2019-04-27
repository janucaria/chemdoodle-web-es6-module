const webpack = require('webpack');
const path = require('path');

/*
 * SplitChunksPlugin is enabled by default and replaced
 * deprecated CommonsChunkPlugin. It automatically identifies modules which
 * should be splitted of chunk by heuristics using module duplication count and
 * module category (i. e. node_modules). And splits the chunks…
 *
 * It is safe to remove "splitChunks" from the generated configuration
 * and was added as an educational example.
 *
 * https://webpack.js.org/plugins/split-chunks-plugin/
 *
 */

/*
 * We've enabled UglifyJSPlugin for you! This minifies your app
 * in order to load faster and run less javascript.
 *
 * https://github.com/webpack-contrib/uglifyjs-webpack-plugin
 *
 */

const UglifyJSPlugin = require('uglifyjs-webpack-plugin');

module.exports = function (env, argv) {
	const outputBanner = `\
//
// ChemDoodle Web Components 8.0.0
//
// http://web.chemdoodle.com
//
// Copyright 2009-2017 iChemLabs, LLC.  All rights reserved.
//
// The ChemDoodle Web Components library is licensed under version 3
// of the GNU GENERAL PUBLIC LICENSE.
//
// You may redistribute it and/or modify it under the terms of the
// GNU General Public License as published by the Free Software Foundation,
// either version 3 of the License, or (at your option) any later version.
//
// As an exception to the GPL, you may distribute this packed form of
// the code without the copy of the GPL license normally required,
// provided you include this license notice and a URL through which
// recipients can access the corresponding unpacked source code. 
//
// This program is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.
//
// ChemDoodle Web Components employs 3rd party libraries under the MIT
// license. For a full list with links to the original source, go to:
// https://web.chemdoodle.com/installation/download/#libraries
//
// Please contact iChemLabs <http://www.ichemlabs.com/contact-us> for
// alternate licensing options.
//`;

	const devtool = argv.mode === 'production' ? 'none' : 'eval-source-map';

	return {
		module: {
			rules: [
				{
					include: [path.resolve(__dirname, 'src')],
					loader: 'babel-loader',

					options: {
						plugins: ['syntax-dynamic-import'],

						presets: [
							[
								'@babel/preset-env',
								{
									modules: false
								}
							]
						]
					},

					test: /\.js$/
				}
			]
		},

		devtool: devtool,

		entry: './src/ChemDoodleWeb-unpacked.js',

		output: {
			filename: 'ChemDoodleWeb.js',
			library: 'ChemDoodle',
			libraryExport: 'ChemDoodle',
			libraryTarget: 'umd',
			path: path.resolve(__dirname, 'install'),
			umdNamedDefine: true
		},

		mode: 'development',

		optimization: {
			minimizer: [
				new UglifyJSPlugin({
					uglifyOptions: {
						output: {
							preamble: outputBanner
						}
					}
				})
			],
			splitChunks: {
				cacheGroups: {
					vendors: {
						priority: -10,
						test: /[\\/]node_modules[\\/]/
					}
				},

				chunks: 'async',
				minChunks: 1,
				minSize: 30000,
				name: true
			}
		}
	};
};
