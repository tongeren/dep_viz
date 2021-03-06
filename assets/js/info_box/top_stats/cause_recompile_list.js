import jQuery from 'jquery'
import lodashSortBy from 'lodash/sortBy'

const EXPECTED_VIEW_MODE = 'ancestors'
const $emptyMessage = jQuery('.cause-recompile-list-empty-message')

// Manages the list that shows which files in the graph cause the most other
// files to recompile
export class CauseRecompileList {
  constructor() {
    this.modeSwitcherInitialMode = null
    this.allFiles = null
  }

  initialize(causeRecompileMap, nodeForceLayout, modeSwitcher, selectedNodeDetails, tabBar) {
    this.causeRecompileMap = causeRecompileMap
    this.nodeForceLayout = nodeForceLayout
    this.modeSwitcher = modeSwitcher
    this.selectedNodeDetails = selectedNodeDetails
    this.tabBar = tabBar

    this.allFiles = calculateTopRecompiles(causeRecompileMap)

    this.render('')
  }

  getTopFiles() {
    return d3.select('.highlight-box .cause-recompile-list')
             .selectAll('div')
             .data()
  }

  render(searchText) {
    const topFiles = findMatchingFiles(this.allFiles, searchText)
          .slice(0, 10)

    const highestCount = calculateHighestCount(topFiles)
    // https://stackoverflow.com/a/14879700
    const numDigits = Math.log(highestCount - 1) * Math.LOG10E + 1 | 0
    const format = d3.format(`${numDigits}`)

    // recompile map shows which files the given id cause to recompile
    const u = d3.select('.highlight-box .cause-recompile-list')
                .selectAll('div')
                .data(topFiles)

    u.enter()
     .append('div')
     .attr('class', 'inline-item hover-bold pre')
     .merge(u)
     .text(d => `${format(d.count - 1)}: ${d.id}`)
     .on('mouseover', (d) => {
       const viewMode = this.modeSwitcher.getViewMode()

       if (viewMode !== EXPECTED_VIEW_MODE) {
         this.modeSwitcherInitialMode = viewMode
         this.modeSwitcher.toggle()
       }

       this.nodeForceLayout.highlightFilesThatDependOnSelectedFile(d.id, true)
     })
     .on('mouseout', (_d) => {
       if (window.vizState.selectedNode) {
       } else {
         if (this.modeSwitcherInitialMode) {
           this.modeSwitcherInitialMode = null
           this.modeSwitcher.toggle()
         }

         this.nodeForceLayout.tabBar.highlightTopStats()
       }
     })
     .on('click', d => {
       console.log('handle click on', d.id)
       if (window.vizState.selectedNode) {
         window.vizState.selectedNode = null
         this.nodeForceLayout.restoreGraph()
       } else {
         window.vizState.selectedNode = d.id

         const viewMode = window.vizState.viewMode
         if (viewMode === 'deps') {
           this.selectedNodeDetails.infoBoxShowSelectedFilesDependencies(d.id)
           this.tabBar.switchTab('selected-file')
         } else if (viewMode === 'ancestors') {
           this.selectedNodeDetails.infoBoxShowSelectedFilesAncestors(d.id)
           this.tabBar.switchTab('selected-file')
         }
       }
     })

    u.exit()
     .remove()

    if (topFiles.length == 0) {
      $emptyMessage.show()
    } else {
      $emptyMessage.hide()
    }
  }
}

function calculateHighestCount(topFiles) {
  if (topFiles.length === 0) {
    return 0
  } else {
    return topFiles[0].count
  }
}

function findMatchingFiles(allFiles, searchText) {
  const fileList = allFiles.filter(d => d.count > 1)
  return searchText === '' ? fileList : fileList.filter(d => d.id.indexOf(searchText) !== -1)
}

function calculateTopRecompiles(causeRecompileMap) {
  const topFiles = []

  for (const id of Object.keys(causeRecompileMap)) {
    topFiles.push({id: id, count: causeRecompileMap[id].length})
  }

  return lodashSortBy(topFiles, d => d.count).reverse()
}
