# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased]

### Changed
- ported the repo from JS to TS

### Added
- type files for the drone and its methods
- this changelog

## [3.0.4] - 2020-03-15
### Changed
- fixed a link in the readme
- updated documentation on the options parameter


## [3.0.3] - 2020-03-15
### Added
- added missing z1 and z2 parameters of the curve command to tello-data.json

## [3.0.2] - 2020-03-15

### Added
- added missing rc command to tello-data.json

## [3.0.1] - 2019-11-27

### Changed
- added breaking changes note on readme


## [3.0.0] - 2019-11-27

### Added
- testing
- linting

### Changed
- removed delays from the tello-data.json file
- removed 'DELAYS' property from index.js
- removed 'bufferOffset' option
- changed the structure of the repository

## [2.1.0] - 2019-01-24

### Changed
- replaced large parts of code with native nodeJS modules (assert, events)
- changed drone function into a class
- removed 'sync' methods, package is now only async

## [2.0.1] - 2019-01-22

### Changed
- fixed bug where class did not send the 'command' command

## [2.0.0] - 2019-01-22

### Added
- added 'async' option to drone constructor
- added method syncSend()
- added method asyncSend()
- added method forceSendSync()
- added method forceSendAsync()

### Changed
- the send() method now handles sync or async depending on options

## [1.0.2] - 2019-01-07
Version patch, nothing changed

## [1.0.1] - 2019-01-07

### Changed
- Fixed spelling in method documentation

## [1.0.0] - 2019-01-07
First publish