(function() {
    "use strict";
    
    var tableXpath = "/html/body/div[2]/div[2]/div[1]/div[2]/div/table";
    var filterAreaXpath = "/html/body/div[2]/div[2]/div[1]/div[1]/div[2]";  // The filter area to watch
    var tableObserver = null;
    var bodyObserver = null;
    var filterAreaObserver = null;
    
    // Function to process all evaluation cells in each row by accumulating
    // all numerators and denominators, then computing an overall percentage.
    function printTableRows(table) {
        var rows = table.getElementsByTagName("tr");
        console.log("Number of rows found: " + rows.length);
        
        for (var i = 0; i < rows.length; i++) {
            var row = rows[i];
            
            // Log all cells in the row to check what we might be missing
            var allCells = row.getElementsByTagName("td");
            console.log("Row " + i + " has " + allCells.length + " total cells");
            
            // Try a more generic selector to see if we're missing any evaluation cells
            var allPossibleEvals = row.querySelectorAll("td.cell--evaluation");
            console.log("Row " + i + " has " + allPossibleEvals.length + " evaluation cells with broader selector");
            
            // Your existing code continues...
            var evaluationCells = row.querySelectorAll("td.cell.cell--evaluation.js-cell-evaluation.evaluation");
            console.log("Row " + i + " has " + evaluationCells.length + " evaluation cells with strict selector");
            
            if (!evaluationCells.length) {
                console.log("Row " + i + ": No evaluation cell with the specified class found.");
                continue;
            }
            
            var totalNumerator = 0;
            var totalDenom = 0;
            
            evaluationCells.forEach(function(evaluationCell, cellIndex) {
                var evaluationSpan = evaluationCell.querySelector("button.js-evaluation-content span[title]");
                if (evaluationSpan) {
                    var resultStr = evaluationSpan.getAttribute("title").trim();
                    console.log("Row " + i + ", Evaluation cell " + cellIndex + " raw result: " + resultStr);
                    // Expecting format like "8/10"
                    var parts = resultStr.split("/");
                    if (parts.length === 2) {
                        var numerator = parseFloat(parts[0].replace(',', '.'));
                        var denominator = parseFloat(parts[1].replace(',', '.'));
                        if (denominator !== 0) {
                            totalNumerator += numerator;
                            totalDenom += denominator;
                        } else {
                            console.log("Row " + i + ", Evaluation cell " + cellIndex + ": Division by zero error.");
                        }
                    } else {
                        console.log("Row " + i + ", Evaluation cell " + cellIndex + ": Unexpected format (" + resultStr + ").");
                    }
                } else {
                    console.log("Row " + i + ", Evaluation cell " + cellIndex + ": Evaluation span not found within cell.");
                }
            });
            
            if (totalDenom !== 0) {
                var overallRatio = totalNumerator / totalDenom;
                // Calculate percentage accurate to one decimal place
                var overallPercentage = (overallRatio * 100).toFixed(1) + "%";
                console.log("Row " + i + " overall computed percentage: " + overallPercentage);
                
                // Remove any existing computed percentage cell classes (in case of an update)
                var cellClassList = ["low", "medium", "high", "very-high"];
                
                // Check if a computed percentage cell already exists for the row
                var existingCell = row.querySelector("td.computed-percent");
                if (existingCell) {
                    existingCell.textContent = overallPercentage;
                    cellClassList.forEach(function(cls) {
                        existingCell.classList.remove(cls);
                    });
                } else {
                    // Create a new cell for the computed overall percentage
                    var newCell = document.createElement("td");
                    newCell.className = "computed-percent";
                    newCell.textContent = overallPercentage;
                    // Insert as the second cell (after the title column)
                    row.children[0].appendChild(newCell);
                    existingCell = newCell;
                }
                
                // Parse the numeric value for decision
                var percentageValue = parseFloat(overallPercentage);
                if (percentageValue < 50) {
                    existingCell.classList.add("low");
                } else if (percentageValue >= 50 && percentageValue < 60) {
                    existingCell.classList.add("medium");
                } else if (percentageValue >= 60 && percentageValue <= 75) {
                    existingCell.classList.add("high");
                } else if (percentageValue > 75) {
                    existingCell.classList.add("very-high");
                }
            } else {
                console.log("Row " + i + ": Total denominator is zero; cannot compute overall percentage.");
            }
        }
    }
    
    // Set up observer for the filter area
    function observeFilterArea() {
        var result = document.evaluate(filterAreaXpath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null);
        var filterArea = result.singleNodeValue;
        
        if (filterArea) {
            console.log("Filter area found, setting up observer.");
            
            if (filterAreaObserver) {
                filterAreaObserver.disconnect();
            }
            
            filterAreaObserver = new MutationObserver(function(mutations) {
                console.log("Change detected in filter area...");
                // When filter changes, check for table again and reprocess
                setTimeout(function() {
                    var tableResult = document.evaluate(tableXpath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null);
                    var table = tableResult.singleNodeValue;
                    if (table) {
                        console.log("Table found after filter change.");
                        addComputedHeader(table);
                        printTableRows(table);
                    }
                }, 500); // Small delay to allow DOM to update
            });
            
            filterAreaObserver.observe(filterArea, { childList: true, subtree: true, attributes: true });
        } else {
            console.log("Filter area not found.");
        }
    }
    
     
    // Observer to watch the document body
    function observeBody() {
        if (bodyObserver) {
            bodyObserver.disconnect();
        }
        
        bodyObserver = new MutationObserver(function(mutations) {
            // Check for both table and filter area
            var tableResult = document.evaluate(tableXpath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null);
            var table = tableResult.singleNodeValue;
            
            if (table) {
                console.log("Table detected via body observer.");
                addComputedHeader(table);
                printTableRows(table);
            }
            
            // Also check for filter area changes
            observeFilterArea();
        });
        
        bodyObserver.observe(document.body, { childList: true, subtree: true });
    }
    
    
    function addComputedHeader(table) {
        var thead = table.querySelector("thead");
        if (thead) {
            var headerRow = thead.querySelector("tr");
            // Check if header cell is already added:
            if (!headerRow.querySelector("th.computed-percent")) {
                var th = document.createElement("th");
                th.className = "computed-percent";
                th.textContent = "Overall %";
                headerRow.appendChild(th);
            }
        }
    }
    
    function checkForTable() {
        var result = document.evaluate(tableXpath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null);
        var table = result.singleNodeValue;
        
        if (table) {
            console.log("Table found initially.");
            addComputedHeader(table);
            printTableRows(table);
        } else {
            console.error("Table not found using XPath: " + tableXpath);
        }
    }
    
    // Start both observers to ensure we catch all changes
    function init() {
        console.log("Initializing BetterTable.js");
        checkForTable();
        observeBody();
        observeFilterArea();
    }
    
    // Initialize everything
    init();
})();