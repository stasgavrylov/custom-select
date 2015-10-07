if (typeof setImmediate == 'undefined')
    setImmediate = setTimeout

!(function() 
{
    'use strict'

    var openedMap = new WeakMap(/* <document, div> */)
    var selectSet = new WeakSet(/* <select>s */)
    var documentSet = new WeakSet(/* <document>s */)

    module.exports = function($select, settings)
    {
        if (selectSet.has($select))
            return
        selectSet.add($select)

        var optionMap = new WeakMap(/* <item, option> */)
        var itemMap = new WeakMap(/* <option, item> */)
        var optgroupMap = new WeakMap(/* <optgroup, item> */)
        var validOptionsArray = []
        var $options = $select.options

        Object.assign(settings || { },
        {
            namespace: 'hc',
            control: 'select',
            separator: '-',
            invalid: 'label',
            template: function($option)
            {
                return $option.textContent
            }
        })

        var CLASSES =
        [
            , 'focus'
            , 'hover'
            , 'option'
            , 'group'
            , 'label'
            , 'disabled'
            , 'closed'
            , 'opened'

            , 'wrapper'
            , 'before'
            , 'current'
            , 'after'
            , 'list'
            , 'search'
        ]
        .reduce(function(object, name)
        {
            object[name.toUpperCase()] = makeName(name)

            return object
        },  { })

        function create(tag, name) 
        {
            if (arguments.length == 1)
            {
                name = tag
                tag = 'div'
            }

            var element = document.createElement(tag)
                element.className = CLASSES[name.toUpperCase()]

            return element
        }

        function makeName(name)
        {
            return Array,
            [
                , settings.namespace
                , settings.control
                , name
            ]
            .filter(String)
            .join(settings.separator)
        }

        function hide($list) 
        {
            if ($list == null) return

            $list.classList.add(CLASSES.CLOSED)
            $list.classList.remove(CLASSES.OPENED)

            return $list
        }

        function show($list)
        {
            if ($list == null) return

            $list.classList.remove(CLASSES.CLOSED)
            $list.classList.add(CLASSES.OPENED)

            return $list
        }

        function append(/* arguments... */) 
        {
            var $element = create.apply(this, arguments)

            return $wrapper.appendChild($element)
        }

        function highlight($element)
        {
            if ($element == null) return

            $hover.classList.remove(CLASSES.HOVER)
            $hover = $element
            $hover.classList.add(CLASSES.HOVER)
        }




        var $wrapper = create('wrapper')
        append('before')
        var $current = append('current')
        append('after')
        var $list = hide(append('ul', 'list'))
        var $hover

        $select.before($wrapper)
        $select.tabIndex = -1

        function build($element)
        {
            var $document = $element.ownerDocument

            var $item = $document.createElement('li')
                $item.className = $element.className

            switch ($element.tagName.toLowerCase())
            {
                case 'option':
                    $item.innerHTML = settings.template($element)
                    $item.classList.add(CLASSES.OPTION)

                    if ($element.selected)
                        setCurrent($item)

                    if (!$element.disabled)
                        if(!$element.parentElement.disabled)
                            validOptionsArray.push($item)

                    optionMap.set($item, $element)
                    itemMap.set($element, $item)

                    break

                case 'optgroup':
                    var $label = create('h3', 'label')
                        $label.textContent = $element.label

                    $item.classList.add(CLASSES.GROUP)
                    $item.append($label)

                    optgroupMap.set($element, $item)

                    adopt($element, $item, build)
            }

            if ($element.disabled)
                $item.classList.add(CLASSES.DISABLED)

            return $item
        }

        adopt($select, $list, build)

        // Transfer select siblings.
        $wrapper.append(after($select, settings.INVALID))

        // Hidden input block.
        var $search = append('input', 'search')
            $search.type = 'search'

        // Assign handlers.
        // Open/close $list.
        function toggleSelect($target)
        {
            var $document = $target.ownerDocument

            if (openedMap.has($document)) 
            {
                var $opened = openedMap.get($document)
                if ($opened != $list) hide($opened)
            }

            if (isHidden($list))
            {
                var $option = $select.selectedOptions[0]

                highlight(itemMap.get($option))
                show($list)
            } 
            else hide($list)

            openedMap.delete($document)
            setImmediate(function()
            {
                openedMap.set($document, $list)
            })
        }

        function isHidden($list)
        {
            return $list.classList.contains(CLASSES.CLOSED)
        }

        // Set selected item as current.
        function setCurrent($item)
        {
            $current.innerHTML = $item.innerHTML
            $hover = $item

            if (optionMap.has($item)) 
            {   
                // To handle possible equal option values
                var $options = [].slice.call($select.options)
                $select.selectedIndex = $options.indexOf(optionMap.get($item))
                hide($list)
            }   
        }

        // Check if target is valid
        function valid($target)
        {
            if ($target.classList.contains(CLASSES.LABEL))
                return

            var $parent = $target.parentElement
            if ($parent.classList.contains(CLASSES.DISABLED))
                return false

            return !$target.classList.contains(CLASSES.DISABLED)
        }

        // Handle events
        on($list, 'click', function(event) 
        {
            var $target = event.target
            if (valid($target)) setCurrent($target)
            else $search.focus()
        })

        on($list, 'mouseover', function(event)
        {
            var $target = event.target

            if ($target == $list) return
            if (valid($target)) 
                highlight($target)
        })

        on($list, 'mouseout', function(event)
        {   
            var $target = event.target
            if ($target != $hover) 
                $target.classList.remove(CLASSES.HOVER)
        })

        // Focus on click.
        on($current, 'click', function(event)
        {
            toggleSelect(event.target)
            $search.focus()
        })

        // Handle select focus/blur.
        on($search, 'focus', function(event) {
            $current.classList.toggle(CLASSES.FOCUS)
        })

        on($search, 'blur', function(event)
        {
            $current.classList.toggle(CLASSES.FOCUS)
        })

        // Handle keyboard.
        on($wrapper, 'keydown', function(event)
        {
            // Highlight next valid sibling.
            function highlightNext() {
                var $option = optionMap.get($hover)
                var index = [].indexOf.call($options, $option) + 1
                
                for (var $next; $next = $options[index]; index++)
                {
                    if (enabled($options[index]))
                        break
                }

                highlight(itemMap.get($next))
            }

            // Highlight prev valid sibling.
            function highlightPrev() {
                var $option = optionMap.get($hover)
                var index = [].indexOf.call($options, $option) - 1

                for (var $previous; $previous = $options[index]; index--)
                {
                    if (enabled($options[index]))
                        break
                }

                highlight(itemMap.get($previous))
            }

            var $target = event.target
            switch(event.which) 
                {
                    case 9: // Tab
                        hide($list)
                        break

                    case 13: // Enter
                        if (!isHidden($list)) setCurrent($hover)
                        else toggleSelect($target)
                        break

                    case 27: // Esc
                        if (!isHidden($list))
                            toggleSelect($target)
                        break

                    case 38: // Up Arrow
                    case 37: // Left Arrow
                        highlightPrev()
                        break

                    case 39: // Right Arrow
                    case 40: // Down Arrow
                        highlightNext()
                        break
                }
        })

        // OBSERVE MUTATIONS
        // Attach MutationObservers.
        var config =
        {
            attributes: true,
            childList: true,
            characterData: true,
            subtree: true
        }

        var observer = new MutationObserver(function(mutations)
        {
            function remove($node)
            {
                if ($node.nodeType != 1) return

                switch($node.tagName.toLowerCase())
                {
                    case 'option':
                        itemMap.get($node).remove()
                        break
                    case 'optgroup':
                        optgroupMap.get($node).remove()
                        break
                }

                $current.innerHTML = ($select.selectedOptions.length)
                                    ? $select.selectedOptions[0].innerHTML
                                    : ''
            }

            // TODO
            mutations.forEach(function(mutation) 
            {
                switch(mutation.type) 
                {
                    case 'childList':
                        if (mutation.removedNodes.length) {
                            console.log('Removed:',mutation.removedNodes);
                            [].forEach.call(mutation.removedNodes, remove) 
                        }
                        // else if (mutation.addedNodes.length)
                        // {
                        //     console.log('Added:', mutation);
                        //     var previousSibling = mutation.previousSibling
                        //     var position = (previousSibling.nodeType==3) ?
                        //                     previousSibling.previousElementSibling :
                        //                     previousSibling
                        //     var HCposition

                        //     if (position) 
                        //     {
                        //         var index = allOpts.indexOf(position)
                        //         HCposition = allHCOpts[index]
                        //     } 
                        //     else 
                        //         position = $list;

                        //     [].forEach.call(mutation.addedNodes, function(node)
                        //     {
                        //         var newNode = build(node)

                        //         if (HCposition) 
                        //             HCposition.after(newNode)
                        //         else
                        //         {
                        //             position.append(newNode)
                        //             $current.textContent = validOptionsArray[0].textContent
                        //         }
                        //     })
                        // }
                        break
                }
                
            })
        })

        observer.observe($select, config)


        
        // Add document click handlers
        var $document = $select.ownerDocument
        if (!documentSet.has($document))
        {
            documentSet.add($document)
            on($document, 'click', hideOpened)
        }

        function hideOpened(event)
        {
            var $document = event.target.ownerDocument

            hide(openedMap.get($document))
        }

    }

    function on($emitter, type, handler)
    {
        return $emitter.addEventListener(type, handler)
            || $emitter
    }

    function adopt(from, to, map)
    {   
        if (arguments.length == 2)
            return to.append.apply(to, from.children)

        var children = [ ].map.call(from.children, map)

        return to.append.apply(to, children)
            || to
    }

    function after($sibling, selector)
    {
        var $fragment = new DocumentFragment()

        while ($sibling = $sibling.nextElementSibling)
            if ($sibling.matches(selector))
                $fragment.append($sibling)

        return $fragment
    }

    function unique(element, index, array)
    {
        return array.indexOf(element) == index
    }

    function enabled($element)
    {
        return !$element.disabled && !$element.parentElement.disabled
    }
})()