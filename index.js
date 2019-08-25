#! /usr/bin/env node
var program = require('commander');
var walk = require('directory-traverser');
var fs = require('fs');

program
  .option('-d, --dir [string]', '发布的文件夹')
  .option('--css-path [string]', '用于模版的css文件链接，如/css/base.css')
  .option('-V, --verbose', '打印日志')
  .parse(process.argv);

function generate(rootDir, htmlTemplate, options) {
  rootDir = trimTrailingSlash(rootDir);
  var excludeDir = options && options.excludeDir;
  var excludeFile = options && options.excludeFile;
  var verbose = !!(options && options.verbose);
  var dirFilter = function (path) {
    var parts = path.split('/');
    return !excludeDir || !stringMatch(parts[parts.length - 1], excludeDir);
  };

  return walk(rootDir, dirFilter, function(dir, filenames) {
    var html = htmlTemplate.replace(/\{title\}/, dir.substr(rootDir.length + 1, dir.length - rootDir.length));
    var aTags = [];
    filenames.forEach(function(filename) {
      if (!excludeFile || (!stringMatch(filename, excludeFile) && !stringMatch(filename, excludeDir))) {
        var abspath = dir + '/' + filename;
        var stat = fs.statSync(abspath);
        var name = stat && stat.isDirectory() ? (filename + '/') : filename;
        aTags.push('<a href="' + name + '">' + name + '</a>\n');
        aTags.push('<br/>');
      } else {
        verbose && console.log('ignoring file: ',filename);
      }
    });
    var fullfilled = html.replace(/\{body\}/, aTags.join(' '));
    var indexFile = dir + '/index.html';

    if (!save(indexFile, fullfilled)) {
      console.error('failed to save file to: ', indexFile);
      return -1;
    } else {
      return 0;
    }
  }, { verbose: verbose });
}

function trimTrailingSlash(rootDir) {
  while(rootDir && rootDir.length && rootDir[rootDir.length - 1] === '/') {
    rootDir = rootDir.substr(0, rootDir.length - 1);
  }
  return rootDir;
}

function stringMatch(str, reg) {
  const matched = str.match(reg);
  return !!(matched && matched[0] && matched[0].length);
}

function save(path, content) {
  fs.writeFileSync(path, content);
  return true;
}

var htmlTemplate = `
  <!DOCTYPE html>
  <html>
    <head>
      <meta charset="UTF-8"><title>{title}</title>{placeholder::link}
    </head>
    <body>{body}</body>
  </html>
`;
var linkRegex = /\{placeholder::link\}/;
if (program.cssPath) {
  htmlTemplate = htmlTemplate.replace(linkRegex, '<link rel="stylesheet" type="text/css" href="' + program.cssPath + '">');
} else {
  htmlTemplate = htmlTemplate.replace(linkRegex,  '');
}
generate(
  program.dir,
  htmlTemplate,
  {
    excludeDir: /.*node_modules|^\.+[^/]/,
    excludeFile: /index.html|^\.+[^/]/,
    verbose: !!program.verbose,
  }
);
