#! /usr/bin/env node
var program = require('commander');
var walk = require('directory-traverser');
var fs = require('fs');

program
  .option('-r, --root-dir [string]', '发布的根目录')
  .option('-p, --prefix [string]', '从服务器根目录到发布的根目录（包含）的路径，\
    以/作为起始字符，如果工作目录在服务器根目录或更上层，\
    -p = /，如 generate -r ./some/path/to/webroot/then/to/the/published/static/dir -p /')
  .option('-V, --verbose', '打印日志')
  .parse(process.argv);

function generate(root, prefix, htmlTemplate, options) {
  root = trimTrailingSlash(root);
  var pref = trimTrailingSlash(prefix);
  var excludeDir = options && options.excludeDir;
  var excludeFile = options && options.excludeFile;
  var verbose = !!(options && options.verbose);
  var dirFilter = function (path) {
    var parts = path.split('/');
    return !excludeDir || !stringMatch(parts[parts.length - 1], excludeDir);
  };

  return walk(root, dirFilter, function(dir, filenames) {
    var html = htmlTemplate.replace(/\{title\}/, pref + dir.substr(root.length, dir.length - root.length));
    var aTags = [];
    filenames.forEach(function(filename) {
      if (!excludeFile || (!stringMatch(filename, excludeFile) && !stringMatch(filename, excludeDir))) {
        var abspath = dir + '/' + filename;
        var relpath = pref + abspath.substr(root.length, abspath.length - root.length);
        aTags.push('<a href="' + relpath + '">' + relpath + '</a>');
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

function trimTrailingSlash(root) {
  while(root && root.length && root[root.length - 1] === '/') {
    root = root.substr(0, root.length - 1);
  }
  return root;
}

function stringMatch(str, reg) {
  const matched = str.match(reg);
  return !!(matched && matched[0] && matched[0].length);
}

function save(path, content) {
  fs.writeFileSync(path, content);
  return true;
}

generate(
  program.rootDir,
  program.prefix,
  '<!DOCTYPE html><html><head><meta charset="UTF-8"><title>{title}</title></head><body>{body}</body></html>\n',
  {
    excludeDir: /.*node_modules|^\.+[^/]/,
    excludeFile: /index.html|^\.+[^/]/,
    verbose: !!program.verbose,
  }
);
