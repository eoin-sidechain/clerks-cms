'use client'

import { useEffect } from 'react'

/**
 * Global component that intercepts browser back button when a PayloadCMS modal is open.
 * Instead of navigating back (which leaves the modal in a broken state), this closes
 * the modal gracefully and prevents the navigation.
 */
export default function AdminNavigationCleanup() {
  useEffect(() => {
    // Track if we've pushed a history state for the modal
    let modalHistoryPushed = false

    // Watch for modals opening
    const observer = new MutationObserver(() => {
      const modalContainers = document.querySelectorAll('.payload__modal-container')

      let hasActiveModal = false
      modalContainers.forEach((container) => {
        const isActive = container.classList.contains('payload__modal-container--enterDone') ||
                        container.classList.contains('payload__modal-container--appearDone')
        if (isActive) {
          hasActiveModal = true
        }
      })

      // If a modal became active and we haven't pushed history yet, push a state
      if (hasActiveModal && !modalHistoryPushed) {
        window.history.pushState({ payloadModal: true }, '')
        modalHistoryPushed = true
      }
      // If no modal is active, reset the flag
      else if (!hasActiveModal && modalHistoryPushed) {
        modalHistoryPushed = false
      }
    })

    // Observe the body for modal class changes
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['class']
    })

    // Handle back button
    const handlePopState = (e: PopStateEvent) => {
      // Check if there's an active modal
      const modalContainers = document.querySelectorAll('.payload__modal-container')

      let hasActiveModal = false
      let activeContainer: HTMLElement | null = null

      modalContainers.forEach((container) => {
        const isActive = container.classList.contains('payload__modal-container--enterDone') ||
                        container.classList.contains('payload__modal-container--appearDone')
        if (isActive) {
          hasActiveModal = true
          activeContainer = container as HTMLElement
        }
      })

      // If there's an active modal, close it instead of navigating
      if (hasActiveModal && activeContainer) {
        // Find and click the backdrop or close button to close the modal properly
        const backdrop = activeContainer.querySelector('[class*="modal-overlay"]') as HTMLElement
        const closeButton = activeContainer.querySelector('button[aria-label="Close"]') as HTMLElement

        if (backdrop) {
          backdrop.click()
        } else if (closeButton) {
          closeButton.click()
        } else {
          // Fallback: click the container itself (which should close on backdrop click)
          activeContainer.click()
        }

        // Push the state back to prevent navigation
        window.history.pushState({ payloadModal: false }, '')
        modalHistoryPushed = false
      }
    }

    window.addEventListener('popstate', handlePopState)

    return () => {
      window.removeEventListener('popstate', handlePopState)
      observer.disconnect()
    }
  }, [])

  return null
}
