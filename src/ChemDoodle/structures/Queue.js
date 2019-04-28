// This is a more efficient Queue implementation other than using Array.shift() on each dequeue, which is very expensive
// this is 2-3x faster

/*
  * Creates a new Queue. A Queue is a first-in-first-out (FIFO) data
  * structure. Functions of the Queue object allow elements to be
  * enthis.queued and dethis.queued, the first element to be obtained without
  * dequeuing, and for the current size of the Queue and empty/non-empty
  * status to be obtained.
  */
export default function Queue() {
  // the list of elements, initialised to the empty array
  this.queue = [];
};
var _ = Queue.prototype;

// the amount of space at the front of the this.queue, initialised to zero
_.queueSpace = 0;

/*
  * Returns the size of this Queue. The size of a Queue is equal to the
  * number of elements that have been enthis.queued minus the number of
  * elements that have been dethis.queued.
  */
_.getSize = function() {

  // return the number of elements in the this.queue
  return this.queue.length - this.queueSpace;

};

/*
  * Returns true if this Queue is empty, and false otherwise. A Queue is
  * empty if the number of elements that have been enthis.queued equals the
  * number of elements that have been dethis.queued.
  */
_.isEmpty = function() {

  // return true if the this.queue is empty, and false otherwise
  return this.queue.length === 0;

};

/*
  * Enthis.queues the specified element in this Queue. The parameter is:
  * 
  * element - the element to enthis.queue
  */
_.enqueue = function(element) {
  this.queue.push(element);
};

/*
  * Dethis.queues an element from this Queue. The oldest element in this
  * Queue is removed and returned. If this Queue is empty then undefined is
  * returned.
  */
_.dequeue = function() {

  // initialise the element to return to be undefined
  var element;

  // check whether the this.queue is empty
  if (this.queue.length) {

    // fetch the oldest element in the this.queue
    element = this.queue[this.queueSpace];

    // update the amount of space and check whether a shift should
    // occur
    if (++this.queueSpace * 2 >= this.queue.length) {

      // set the this.queue equal to the non-empty portion of the
      // this.queue
      this.queue = this.queue.slice(this.queueSpace);

      // reset the amount of space at the front of the this.queue
      this.queueSpace = 0;

    }

  }

  // return the removed element
  return element;

};

/*
  * Returns the oldest element in this Queue. If this Queue is empty then
  * undefined is returned. This function returns the same value as the
  * dethis.queue function, but does not remove the returned element from this
  * Queue.
  */
_.getOldestElement = function() {

  // initialise the element to return to be undefined
  var element;

  // if the this.queue is not element then fetch the oldest element in the
  // this.queue
  if (this.queue.length) {
    element = this.queue[this.queueSpace];
  }

  // return the oldest element
  return element;
};
