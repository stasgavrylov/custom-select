DocumentFragment.prototype.append = Element.prototype.append;

!(function(global, options) 
{
    "use strict"
    Object.assign(options,
    {
        COMPANY: 'hc',
        CONTROL: 'select',
        SEPARATOR: '-'
    });

    // Helpers.
    function create(tag, name) 
    {
        var element = $('<' + tag + '>')
            element.className = makeName(name);

        return element;
    }

    function makeName(name) 
    {
        return [
                    , options.COMPANY
                    , options.CONTROL
                    , name
                ].filter(String)
                .join(options.SEPARATOR)
    }

    function hide($element) 
    {
        return $element.style.setProperty('display', 'none')
            || $element
    }

    function show($element)
    {
        return $element.style.removeProperty('display')
            || $element
    }

    var classes = 
    {
        highlighted:  makeName('highlighted'),
        focused:      makeName('focused'),
        group:        makeName('group'),
        label:        makeName('label')
    }

    // Init plugin.
    var selectElements = $$('select:not([mutiple])')
        selectElements.forEach(replaceSelectElement)
    // Var to store current opened HCSelect.
    var currentOpenedHCSelect

    // Replace <select> with custom structure.
    function replaceSelectElement(select) 
    {
        var customOptionsArray = [];
        /*
         *  CUSTOM SELECT.
         */
        var HCSelect = create('div', 'wrapper')
        select.before(HCSelect)
        // select.tabIndex = -1 // Fix HCSelect tab behaviour

        // Blocks.
        function addHCPrefixedBlock(parent) 
        {
            return function(type, className) 
            {
                var block = create(type, className);
                parent.append(block);
                return block;
            }
        }
        var addBlockToHCSelect = addHCPrefixedBlock(HCSelect);

        var HCSelectBefore = addBlockToHCSelect('div', 'before');

        var HCSelectCurrent = addBlockToHCSelect('div', 'current');
            HCSelectCurrent.textContent = select.options[select.selectedIndex]
                                                .textContent;

        var HCSelectAfter = addBlockToHCSelect('div', 'after');

        var HCSelectList = addBlockToHCSelect('ul', 'list');
            hide(HCSelectList);
            

        // Transfer select children.
        function transferChildren(parent)
        {   
            // Attach MutationObservers.
            // function attachMO($element, $related)
            // {
            //     var config =
            //     {
            //         attributes: true,
            //         childList: true,
            //         characterData: true,
            //         subtree: true
            //     }

            //     var observer = new MutationObserver(function(mutations)
            //     {
            //         mutations.forEach(function(mutation) {
            //             console.log(mutation);
            //         });
            //     })
            //     // pass in the target node, as well as the observer options
            //     observer.observe($element, config)
                 
            // }

            return Array.prototype.map.call(parent.children, function(child) 
            {
                var newChild = $('<li>');
                if (child.disabled)
                        newChild.setAttribute('data-disabled', '');

                var tag = child.tagName.toLowerCase();

                switch (tag)
                {
                    case 'option':
                        newChild.textContent = child.textContent;
                        customOptionsArray.push(newChild);
                        break;

                    case 'optgroup':
                        newChild.classList.add(classes.group);
                        var label = create('div', 'label');
                        label.textContent = child.label;
                        newChild.append(label);
                        newChild.append
                                .apply(newChild, transferChildren(child));
                        break;
                }
                return newChild;
            });

        }
        HCSelectList.append.apply(HCSelectList, transferChildren(select));

        // Transfer select siblings.
        var selectSiblings = new DocumentFragment();
        var allowedSiblings = ['label', 'div', 'span'].join();
        var currentSibling;
        while (currentSibling = select.nextElementSibling) 
        {
            if (currentSibling.matches(allowedSiblings)) 
                selectSiblings.append(select.nextElementSibling);
            else
                break;
        }
        HCSelect.append(select);
        HCSelect.append(selectSiblings);

        // Hidden input block.
        var HCSelectSearch = addBlockToHCSelect('input', 'search');
            HCSelectSearch.type = 'search';

        // Save classes.
        classes.wrapper = HCSelect.className
        classes.before = HCSelectBefore.className;
        classes.current = HCSelectCurrent.className;
        classes.after = HCSelectAfter.className;
        classes.list = HCSelectList.className;
        classes.search = HCSelectSearch.className;

        // Assign handlers.
        // Open/close HCSelect.
        function toggleSelect() 
        {
            if (currentOpenedHCSelect && currentOpenedHCSelect != HCSelectList)
                hide(currentOpenedHCSelect)
            if (getComputedStyle(HCSelectList).display == 'none')
                show(HCSelectList)
            else
                hide(HCSelectList)
            currentOpenedHCSelect = HCSelectList
        }

        // Detect HCSelectList events.
        // Helper - Filter unwanted <li>.
        function unwantedTarget(target)
        {
            if (target == HCSelectList || 
                target.classList.contains(classes.label) || 
                target.closest('li[data-disabled]'))
                return true;
        }
        $.on(HCSelectList, 'click', (e) => 
        {
            if (unwantedTarget(e.target))  
            {   
                HCSelectSearch.focus();
                return;
            }
            else {
                HCSelectCurrent.textContent = e.target.textContent;
                select.selectedIndex = customOptionsArray.indexOf(e.target);
                hide(HCSelectList);
            }
        });
        $.on(HCSelectList, 'mouseover', function(e)
        {
            if (unwantedTarget(e.target)) return;
            else e.target.classList.add(classes.highlighted);
        });
        $.on(HCSelectList, 'mouseout', function(e)
        {
            if (unwantedTarget(e.target)) return;
            else e.target.classList.remove(classes.highlighted);
        });

        // Focus on click.
        $.on(HCSelectCurrent, 'click', function(e) {
            toggleSelect();
            HCSelectSearch.focus();
        });
        // Handle select focus/blur.
        $.on(HCSelectSearch, 'focus', function() {
            // toggleSelect();
            HCSelectCurrent.classList.toggle(classes.focused);
        });
        $.on(HCSelectSearch, 'blur', function(e) {
            var selected = HCSelectList.query('.'+classes.highlighted);
            if (selected)
                selected.classList.remove(classes.highlighted);
            HCSelectCurrent.classList.toggle(classes.focused);
        });

        // Handle keyboard.
        $.on(HCSelect, 'keydown', function(e) {
            // Highlight next valid sibling.
            function highlightNext(el) {
                var highlighted = $('.'+classes.highlighted);
                var next;

                if (el.contains(highlighted)) {
                    next = getNextValidLi(highlighted);
                    if (next) {
                        highlighted.classList.toggle(classes.highlighted);
                        next.classList.toggle(classes.highlighted);
                    }
                    else return;
                }
                else {
                    next = getNextValidLi(el);
                    if (next)
                        next.classList.toggle(classes.highlighted);
                }
            }

            // Helper for highlightNext().
            function getNextValidLi(current) {
                var next = current.firstElementChild ||
                           current.nextElementSibling ||
                           current.parentElement.nextElementSibling;
                if (next == select) return;

                if (next && (next.dataset.hasOwnProperty('disabled') || 
                    next.parentElement.dataset.hasOwnProperty('disabled') ||
                    next.tagName != 'LI' || 
                    next.classList.contains(classes.group))) 
                {
                        next = getNextValidLi(next);
                }
                return next;
            }

            // Highlight prev valid sibling.
            function highlightPrev(el) {
                var highlighted = el.query('.'+classes.highlighted);
                var prev;

                if (el.contains(highlighted)) {
                    prev = getPrevValidLi(highlighted);
                    if (prev) {
                        highlighted.classList.remove(classes.highlighted);
                        prev.classList.add(classes.highlighted);
                    }
                    else return;
                }
                else {
                    prev = getPrevValidLi(el);
                    if (prev)
                        prev.classList.toggle(classes.highlighted);
                }
            }

            // Helper for highlightPrev().
            function getPrevValidLi(current) {
                if (current == current.parentElement.firstElementChild &&
                    current.parentElement == HCSelectList) return;

                var prev = current.lastElementChild ||
                           current.previousElementSibling ||
                           current.parentElement.previousElementSibling;

                if (prev && (prev.dataset.hasOwnProperty('disabled') || 
                    prev.parentElement.dataset.hasOwnProperty('disabled') ||
                    prev.tagName != 'LI' || 
                    prev.classList.contains(classes.group))) 
                {
                        prev = getPrevValidLi(prev);
                }
                return prev;
            }

            var openedSelect;
            if (openedSelect = HCSelect.query('.'+classes.focused)) 
            {
                switch(e.which) 
                {
                    case 9: // Tab
                        hide(openedSelect.parentElement
                                         .query('.'+classes.list));
                        break
                    case 13: // Enter
                        var highlighted = HCSelectList.query('.'+classes.highlighted)
                        if (highlighted) 
                        {
                            select.selectedIndex = customOptionsArray
                              .indexOf(highlighted)
                            HCSelectCurrent.textContent = highlighted.textContent
                        }
                        toggleSelect()
                        break
                    case 27: // Esc
                        if (currentOpenedHCSelect)
                            toggleSelect()
                        break
                    case 38: // UpArrow
                        highlightPrev(HCSelectList);
                        break
                    case 40: // DownArrow
                        highlightNext(HCSelectList);
                        break
                }
            }
        });
    } // replaceSelectElement.

    // Detect clicks outside of HCSelectList.
    $.on(document, 'click', (e) => {
        var hc = e.target.closest('.'+classes.wrapper);
        if (!hc && currentOpenedHCSelect) {
            currentOpenedHCSelect.style.display = 'none';
        }
    })

})(this, {})
